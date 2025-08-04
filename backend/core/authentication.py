from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication that doesn't enforce CSRF for API endpoints.
    This is safe for API-only endpoints where CSRF protection isn't needed.
    """
    
    def enforce_csrf(self, request):
        """
        Override to skip CSRF validation for API endpoints
        """
        return  # Skip CSRF validation
