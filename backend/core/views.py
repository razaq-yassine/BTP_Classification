from django.contrib.auth import login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.core.exceptions import FieldDoesNotExist
from .models import User, Customer
from .serializers import UserSerializer, LoginSerializer, CustomerSerializer
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    """Get CSRF token for authentication"""
    return JsonResponse({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    """Handle user login"""
    logger.info(f"Login attempt - Method: {request.method}, Data: {request.data}")
    
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        logger.info(f"Authentication successful for user: {user.username}")
        login(request, user)
        user_data = UserSerializer(user).data
        logger.info(f"Login successful, returning user data: {user_data}")
        return Response({
            'message': 'Login successful',
            'user': user_data
        }, status=status.HTTP_200_OK)
    
    logger.error(f"Login failed - Serializer errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def logout_view(request):
    """Handle user logout"""
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class CustomerListView(generics.ListAPIView):
    """List all customers - returns JSON data with support for filtering, field selection, and search"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = Customer.objects.all()
        
        # Handle search by specific field (e.g., full_name=john)
        for param, value in self.request.query_params.items():
            if param in ['full_name', 'first_name', 'last_name', 'email', 'company'] and value:
                # Use icontains for partial matching
                filter_kwargs = {f'{param}__icontains': value}
                queryset = queryset.filter(**filter_kwargs)
        
        # Handle ordering
        ordering = self.request.query_params.get('ordering', '-id')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        # Handle limit
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except ValueError:
                pass
        
        return queryset
    
    def get_serializer(self, *args, **kwargs):
        """Override serializer to handle field selection"""
        serializer = super().get_serializer(*args, **kwargs)
        
        # Handle field selection
        fields = self.request.query_params.get('fields')
        if fields:
            allowed_fields = {'id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'company', 'address', 'is_active'}
            requested_fields = set(fields.split(','))
            # Only include allowed fields
            valid_fields = requested_fields.intersection(allowed_fields)
            if valid_fields:
                serializer.fields = {field: serializer.fields[field] for field in valid_fields if field in serializer.fields}
        
        return serializer
    
    def get(self, request, *args, **kwargs):
        """Override to return customers as JSON for dashboard"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'customers': serializer.data,
            'count': len(serializer.data)
        })


class CustomerDetailView(generics.RetrieveAPIView):
    """Retrieve a single customer by ID"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generic_model_list(request, model_name):
    """Generic API endpoint to list records from any model with filtering, field selection, and search"""
    try:
        # Get the model class from the app
        model_class = apps.get_model('core', model_name.capitalize())
    except LookupError:
        return Response({
            'error': f'Model "{model_name}" not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    try:
        # Start with all objects
        queryset = model_class.objects.all()
        
        # Get all field names for the model
        model_fields = [field.name for field in model_class._meta.get_fields() if not field.many_to_many and not field.one_to_many]
        # Add properties if they exist (like full_name)
        if hasattr(model_class, 'full_name'):
            model_fields.append('full_name')
        
        # Handle search by specific field
        for param, value in request.query_params.items():
            if param in model_fields and value and param not in ['fields', 'limit', 'ordering']:
                # Handle property fields differently
                if param == 'full_name' and hasattr(model_class, 'full_name'):
                    # For full_name, search in both first_name and last_name
                    from django.db.models import Q
                    queryset = queryset.filter(
                        Q(first_name__icontains=value) | Q(last_name__icontains=value)
                    )
                else:
                    # Regular field search
                    try:
                        model_class._meta.get_field(param)
                        filter_kwargs = {f'{param}__icontains': value}
                        queryset = queryset.filter(**filter_kwargs)
                    except FieldDoesNotExist:
                        continue
        
        # Handle ordering
        ordering = request.query_params.get('ordering', '-id')
        if ordering:
            # Validate ordering field exists
            ordering_field = ordering.lstrip('-')
            if ordering_field in model_fields or ordering_field == 'id':
                queryset = queryset.order_by(ordering)
        
        # Handle limit
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except ValueError:
                pass
        
        # Convert queryset to list to handle properties like full_name
        records = list(queryset)
        
        # Handle field selection
        fields = request.query_params.get('fields')
        if fields:
            requested_fields = set(fields.split(','))
            valid_fields = requested_fields.intersection(set(model_fields + ['id']))
            
            # Build response with only requested fields
            result_data = []
            for record in records:
                record_data = {}
                for field in valid_fields:
                    if hasattr(record, field):
                        value = getattr(record, field)
                        # Handle callable properties
                        if callable(value):
                            value = value()
                        record_data[field] = value
                result_data.append(record_data)
        else:
            # Return all fields using model's default serialization
            result_data = []
            for record in records:
                record_data = {'id': record.id}
                for field_name in model_fields:
                    if hasattr(record, field_name) and field_name != 'id':
                        value = getattr(record, field_name)
                        if callable(value):
                            value = value()
                        record_data[field_name] = value
                result_data.append(record_data)
        
        return Response({
            model_name: result_data,
            'count': len(result_data)
        })
        
    except Exception as e:
        logger.error(f'Error in generic_model_list for {model_name}: {str(e)}')
        return Response({
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
