package com.genericsaas.controller;

import com.genericsaas.model.Order;
import com.genericsaas.model.Customer;
import com.genericsaas.repository.OrderRepository;
import com.genericsaas.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private CustomerRepository customerRepository;

    // Get all orders with pagination and optional search
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String fields) {
        
        System.out.println("📋 Getting orders - Page: " + page + ", Size: " + size + ", Sort: " + sortBy + " " + sortOrder);
        if (search != null) {
            System.out.println("🔍 Search term: " + search);
        }
        if (fields != null) {
            System.out.println("📋 Requested fields: " + fields);
        }

        try {
            // Create sort object
            Sort sort = sortOrder.equalsIgnoreCase("desc") 
                ? Sort.by(sortBy).descending() 
                : Sort.by(sortBy).ascending();
            
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<Order> orderPage;

            // Search or get all
            if (search != null && !search.trim().isEmpty()) {
                orderPage = orderRepository.searchOrders(search.trim(), pageable);
            } else {
                orderPage = orderRepository.findAll(pageable);
            }

            // Apply field filtering if requested
            List<Object> filteredOrders;
            if (fields != null && !fields.trim().isEmpty()) {
                List<String> requestedFields = Arrays.asList(fields.split(","))
                    .stream()
                    .map(String::trim)
                    .collect(Collectors.toList());
                
                filteredOrders = orderPage.getContent().stream()
                    .map(order -> filterOrderFields(order, requestedFields))
                    .collect(Collectors.toList());
            } else {
                filteredOrders = orderPage.getContent().stream()
                    .map(order -> (Object) order)
                    .collect(Collectors.toList());
            }

            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("orders", filteredOrders);
            response.put("count", orderPage.getTotalElements());
            response.put("totalPages", orderPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);

            System.out.println("✅ Retrieved " + filteredOrders.size() + " orders (total: " + orderPage.getTotalElements() + ")");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ Error getting orders: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve orders: " + e.getMessage()));
        }
    }

    // Get orders by customer ID
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> getOrdersByCustomer(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String fields) {
        
        System.out.println("📋 Getting orders for customer ID: " + customerId);
        if (search != null) {
            System.out.println("🔍 Search term: " + search);
        }
        if (fields != null) {
            System.out.println("📋 Requested fields: " + fields);
        }

        try {
            // Create sort object
            Sort sort = sortOrder.equalsIgnoreCase("desc") 
                ? Sort.by(sortBy).descending() 
                : Sort.by(sortBy).ascending();
            
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<Order> orderPage;

            // Search or get all for customer
            if (search != null && !search.trim().isEmpty()) {
                orderPage = orderRepository.searchOrdersByCustomer(customerId, search.trim(), pageable);
            } else {
                orderPage = orderRepository.findByCustomerIdAndIsActiveTrue(customerId, pageable);
            }

            // Apply field filtering if requested
            List<Object> filteredOrders;
            if (fields != null && !fields.trim().isEmpty()) {
                List<String> requestedFields = Arrays.asList(fields.split(","))
                    .stream()
                    .map(String::trim)
                    .collect(Collectors.toList());
                
                filteredOrders = orderPage.getContent().stream()
                    .map(order -> filterOrderFields(order, requestedFields))
                    .collect(Collectors.toList());
            } else {
                filteredOrders = orderPage.getContent().stream()
                    .map(order -> (Object) order)
                    .collect(Collectors.toList());
            }

            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("orders", filteredOrders);
            response.put("count", orderPage.getTotalElements());
            response.put("totalPages", orderPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);

            System.out.println("✅ Retrieved " + filteredOrders.size() + " orders for customer " + customerId + " (total: " + orderPage.getTotalElements() + ")");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ Error getting orders for customer " + customerId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve orders: " + e.getMessage()));
        }
    }

    // Get single order by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        System.out.println("📋 Getting order with ID: " + id);
        
        Optional<Order> order = orderRepository.findById(id);
        if (order.isPresent()) {
            System.out.println("✅ Found order: " + order.get().getOrderNumber());
            return ResponseEntity.ok(order.get());
        } else {
            System.out.println("❌ Order not found with ID: " + id);
            return ResponseEntity.notFound().build();
        }
    }

    // Create new order
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        System.out.println("📋 Creating new order: " + order.getOrderNumber());
        
        try {
            // Validate customer exists
            if (order.getCustomer() != null && order.getCustomer().getId() != null) {
                Optional<Customer> customer = customerRepository.findById(order.getCustomer().getId());
                if (customer.isPresent()) {
                    order.setCustomer(customer.get());
                } else {
                    return ResponseEntity.badRequest().build();
                }
            }
            
            Order savedOrder = orderRepository.save(order);
            System.out.println("✅ Created order with ID: " + savedOrder.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
        } catch (Exception e) {
            System.err.println("❌ Error creating order: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Update order
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Order> updateOrder(@PathVariable Long id, @RequestBody Order orderDetails) {
        System.out.println("📋 Updating order with ID: " + id);
        
        try {
            Optional<Order> optionalOrder = orderRepository.findById(id);
            if (optionalOrder.isPresent()) {
                Order order = optionalOrder.get();
                
                // Update fields
                if (orderDetails.getOrderNumber() != null) {
                    order.setOrderNumber(orderDetails.getOrderNumber());
                }
                if (orderDetails.getStatus() != null) {
                    order.setStatus(orderDetails.getStatus());
                }
                if (orderDetails.getTotalAmount() != null) {
                    order.setTotalAmount(orderDetails.getTotalAmount());
                }
                if (orderDetails.getDescription() != null) {
                    order.setDescription(orderDetails.getDescription());
                }
                if (orderDetails.getOrderDate() != null) {
                    order.setOrderDate(orderDetails.getOrderDate());
                }
                if (orderDetails.getDeliveryDate() != null) {
                    order.setDeliveryDate(orderDetails.getDeliveryDate());
                }
                if (orderDetails.getIsActive() != null) {
                    order.setIsActive(orderDetails.getIsActive());
                }
                
                // Update customer if provided
                if (orderDetails.getCustomer() != null && orderDetails.getCustomer().getId() != null) {
                    Optional<Customer> customer = customerRepository.findById(orderDetails.getCustomer().getId());
                    if (customer.isPresent()) {
                        order.setCustomer(customer.get());
                    }
                }
                
                Order updatedOrder = orderRepository.save(order);
                System.out.println("✅ Updated order: " + updatedOrder.getOrderNumber());
                return ResponseEntity.ok(updatedOrder);
            } else {
                System.out.println("❌ Order not found with ID: " + id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Error updating order: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Soft delete order
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, String>> deleteOrder(@PathVariable Long id) {
        System.out.println("📋 Soft deleting order with ID: " + id);
        
        try {
            Optional<Order> optionalOrder = orderRepository.findById(id);
            if (optionalOrder.isPresent()) {
                Order order = optionalOrder.get();
                order.setIsActive(false);
                orderRepository.save(order);
                System.out.println("✅ Soft deleted order: " + order.getOrderNumber());
                
                Map<String, String> response = new HashMap<>();
                response.put("message", "Order deleted successfully");
                return ResponseEntity.ok(response);
            } else {
                System.out.println("❌ Order not found with ID: " + id);
                Map<String, String> response = new HashMap<>();
                response.put("error", "Order not found");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Error deleting order: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("error", "Failed to delete order: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Helper method to filter order fields based on requested fields
    private Map<String, Object> filterOrderFields(Order order, List<String> requestedFields) {
        Map<String, Object> filteredOrder = new HashMap<>();
        
        for (String field : requestedFields) {
            try {
                switch (field.toLowerCase()) {
                    case "id":
                        filteredOrder.put("id", order.getId());
                        break;
                    case "ordernumber":
                        filteredOrder.put("orderNumber", order.getOrderNumber());
                        break;
                    case "status":
                        filteredOrder.put("status", order.getStatus());
                        break;
                    case "totalamount":
                        filteredOrder.put("totalAmount", order.getTotalAmount());
                        break;
                    case "description":
                        filteredOrder.put("description", order.getDescription());
                        break;
                    case "orderdate":
                        filteredOrder.put("orderDate", order.getOrderDate());
                        break;
                    case "deliverydate":
                        filteredOrder.put("deliveryDate", order.getDeliveryDate());
                        break;
                    case "isactive":
                        filteredOrder.put("isActive", order.getIsActive());
                        break;
                    case "createdat":
                        filteredOrder.put("createdAt", order.getCreatedAt());
                        break;
                    case "updatedat":
                        filteredOrder.put("updatedAt", order.getUpdatedAt());
                        break;
                    case "customer":
                        if (order.getCustomer() != null) {
                            Map<String, Object> customerData = new HashMap<>();
                            customerData.put("id", order.getCustomer().getId());
                            customerData.put("firstName", order.getCustomer().getFirstName());
                            customerData.put("lastName", order.getCustomer().getLastName());
                            customerData.put("email", order.getCustomer().getEmail());
                            filteredOrder.put("customer", customerData);
                        }
                        break;
                    case "customername":
                        if (order.getCustomer() != null) {
                            filteredOrder.put("customerName", 
                                order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName());
                        }
                        break;
                    default:
                        System.out.println("⚠️ Unknown field requested: " + field);
                        break;
                }
            } catch (Exception e) {
                System.err.println("❌ Error filtering field '" + field + "': " + e.getMessage());
            }
        }
        
        // Always include ID for navigation
        if (!filteredOrder.containsKey("id")) {
            filteredOrder.put("id", order.getId());
        }
        
        return filteredOrder;
    }
}
