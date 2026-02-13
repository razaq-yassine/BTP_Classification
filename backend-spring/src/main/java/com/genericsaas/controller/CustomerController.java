package com.genericsaas.controller;

import com.genericsaas.model.Customer;
import com.genericsaas.repository.CustomerRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.lang.reflect.Field;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/customers")
public class CustomerController {
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @GetMapping
    public ResponseEntity<?> getAllCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String fields) {
        
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<Customer> customerPage;
            
            if (search != null && !search.trim().isEmpty()) {
                customerPage = customerRepository.searchCustomers(search.trim(), pageable);
            } else {
                customerPage = customerRepository.findActiveCustomers(pageable);
            }
            
            // Apply field filtering if requested
            List<Object> filteredCustomers;
            if (fields != null && !fields.trim().isEmpty()) {
                List<String> requestedFields = Arrays.asList(fields.split(","))
                    .stream()
                    .map(String::trim)
                    .collect(Collectors.toList());
                
                filteredCustomers = customerPage.getContent().stream()
                    .map(customer -> filterCustomerFields(customer, requestedFields))
                    .collect(Collectors.toList());
            } else {
                filteredCustomers = customerPage.getContent().stream()
                    .map(customer -> (Object) customer)
                    .collect(Collectors.toList());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("customers", filteredCustomers);
            response.put("count", customerPage.getTotalElements());
            response.put("totalPages", customerPage.getTotalPages());
            response.put("currentPage", customerPage.getNumber());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error retrieving customers: " + e.getMessage());
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomerById(@PathVariable Long id) {
        try {
            Optional<Customer> customer = customerRepository.findById(id);
            if (customer.isPresent()) {
                return ResponseEntity.ok(customer.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error retrieving customer: " + e.getMessage());
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createCustomer(@Valid @RequestBody Customer customer) {
        try {
            Customer savedCustomer = customerRepository.save(customer);
            return ResponseEntity.ok(savedCustomer);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error creating customer: " + e.getMessage());
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @Valid @RequestBody Customer customerDetails) {
        try {
            Optional<Customer> optionalCustomer = customerRepository.findById(id);
            if (optionalCustomer.isPresent()) {
                Customer customer = optionalCustomer.get();
                customer.setFirstName(customerDetails.getFirstName());
                customer.setLastName(customerDetails.getLastName());
                customer.setEmail(customerDetails.getEmail());
                customer.setPhone(customerDetails.getPhone());
                customer.setCompany(customerDetails.getCompany());
                customer.setAddress(customerDetails.getAddress());
                customer.setIsActive(customerDetails.getIsActive());
                
                Customer updatedCustomer = customerRepository.save(customer);
                return ResponseEntity.ok(updatedCustomer);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error updating customer: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        try {
            Optional<Customer> optionalCustomer = customerRepository.findById(id);
            if (optionalCustomer.isPresent()) {
                Customer customer = optionalCustomer.get();
                customer.setIsActive(false); // Soft delete
                customerRepository.save(customer);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting customer: " + e.getMessage());
        }
    }
    
    /**
     * Helper method to filter customer fields based on requested fields
     */
    private Map<String, Object> filterCustomerFields(Customer customer, List<String> requestedFields) {
        Map<String, Object> filteredCustomer = new HashMap<>();
        
        // Always include id for navigation purposes
        if (!requestedFields.contains("id")) {
            requestedFields.add("id");
        }
        
        for (String fieldName : requestedFields) {
            try {
                switch (fieldName.toLowerCase()) {
                    case "id":
                        filteredCustomer.put("id", customer.getId());
                        break;
                    case "firstname":
                        filteredCustomer.put("firstName", customer.getFirstName());
                        break;
                    case "lastname":
                        filteredCustomer.put("lastName", customer.getLastName());
                        break;
                    case "fullname":
                        // Computed field
                        String fullName = (customer.getFirstName() != null ? customer.getFirstName() : "") + 
                                        (customer.getLastName() != null ? " " + customer.getLastName() : "");
                        filteredCustomer.put("fullName", fullName.trim());
                        break;
                    case "email":
                        filteredCustomer.put("email", customer.getEmail());
                        break;
                    case "phone":
                        filteredCustomer.put("phone", customer.getPhone());
                        break;
                    case "company":
                        filteredCustomer.put("company", customer.getCompany());
                        break;
                    case "address":
                        filteredCustomer.put("address", customer.getAddress());
                        break;
                    case "isactive":
                        filteredCustomer.put("isActive", customer.getIsActive());
                        break;
                    case "createdat":
                        filteredCustomer.put("createdAt", customer.getCreatedAt());
                        break;
                    case "updatedat":
                        filteredCustomer.put("updatedAt", customer.getUpdatedAt());
                        break;
                    default:
                        // Log unknown field but don't fail
                        System.out.println("Unknown field requested: " + fieldName);
                        break;
                }
            } catch (Exception e) {
                // Log error but continue processing other fields
                System.err.println("Error processing field " + fieldName + ": " + e.getMessage());
            }
        }
        
        return filteredCustomer;
    }
}
