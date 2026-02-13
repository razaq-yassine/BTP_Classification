package com.genericsaas.repository;

import com.genericsaas.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // Find orders by customer ID
    Page<Order> findByCustomerIdAndIsActiveTrue(Long customerId, Pageable pageable);
    
    // Find orders by customer ID (list without pagination)
    List<Order> findByCustomerIdAndIsActiveTrue(Long customerId);
    
    // Find by order number
    Optional<Order> findByOrderNumberAndIsActiveTrue(String orderNumber);
    
    // Search orders by various fields
    @Query("SELECT o FROM Order o WHERE o.isActive = true AND " +
           "(LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.status) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Order> searchOrders(@Param("search") String search, Pageable pageable);
    
    // Search orders by customer ID and search term
    @Query("SELECT o FROM Order o WHERE o.customer.id = :customerId AND o.isActive = true AND " +
           "(LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.status) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Order> searchOrdersByCustomer(@Param("customerId") Long customerId, @Param("search") String search, Pageable pageable);
    
    // Count orders by customer
    long countByCustomerIdAndIsActiveTrue(Long customerId);
    
    // Find orders by status
    Page<Order> findByStatusAndIsActiveTrue(String status, Pageable pageable);
    
    // Find orders by customer and status
    Page<Order> findByCustomerIdAndStatusAndIsActiveTrue(Long customerId, String status, Pageable pageable);
}
