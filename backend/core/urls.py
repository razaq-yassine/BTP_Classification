from django.urls import path
from . import views

urlpatterns = [
    path('auth/csrf/', views.csrf_token, name='csrf_token'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/user/', views.current_user, name='current_user'),
    path('customers/', views.CustomerListView.as_view(), name='customers'),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view(), name='customer_detail'),
]
