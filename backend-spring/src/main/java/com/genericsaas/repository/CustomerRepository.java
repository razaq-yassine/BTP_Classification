package com.genericsaas.repository;

import com.genericsaas.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    
    List<Customer> findByIsActiveTrue();
    
    @Query("SELECT c FROM Customer c WHERE c.isActive = true ORDER BY c.createdAt DESC")
    Page<Customer> findActiveCustomers(Pageable pageable);
    
    @Query("SELECT c FROM Customer c WHERE " +
           "(LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.company) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "c.isActive = true")
    List<Customer> searchCustomers(@Param("search") String search);
    
    @Query("SELECT c FROM Customer c WHERE " +
           "(LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.company) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "c.isActive = true")
    Page<Customer> searchCustomers(@Param("search") String search, Pageable pageable);
}
