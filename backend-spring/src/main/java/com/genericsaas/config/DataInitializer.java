package com.genericsaas.config;

import com.genericsaas.model.Customer;
import com.genericsaas.model.Order;
import com.genericsaas.model.User;
import com.genericsaas.repository.CustomerRepository;
import com.genericsaas.repository.OrderRepository;
import com.genericsaas.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) throws Exception {
        // Create default admin user if not exists
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@example.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFirstName("Admin");
            admin.setLastName("User");
            admin.setIsActive(true);
            userRepository.save(admin);
            System.out.println("Default admin user created: admin/admin123");
        }
        
        // Create sample customers if none exist
        if (customerRepository.count() == 0) {
            Customer customer1 = new Customer();
            customer1.setFirstName("John");
            customer1.setLastName("Doe");
            customer1.setEmail("john.doe@example.com");
            customer1.setPhone("+1234567890");
            customer1.setCompany("Acme Corp");
            customer1.setAddress("123 Main St, Anytown, USA");
            customerRepository.save(customer1);
            
            Customer customer2 = new Customer();
            customer2.setFirstName("Jane");
            customer2.setLastName("Smith");
            customer2.setEmail("jane.smith@example.com");
            customer2.setPhone("+1987654321");
            customer2.setCompany("Tech Solutions");
            customer2.setAddress("456 Oak Ave, Another City, USA");
            customerRepository.save(customer2);
            
            Customer customer3 = new Customer();
            customer3.setFirstName("Bob");
            customer3.setLastName("Johnson");
            customer3.setEmail("bob.johnson@example.com");
            customer3.setPhone("+1555123456");
            customer3.setCompany("Global Industries");
            customer3.setAddress("789 Pine Rd, Somewhere, USA");
            customerRepository.save(customer3);
            
            Customer customer4 = new Customer();
            customer4.setFirstName("Alice");
            customer4.setLastName("Williams");
            customer4.setEmail("alice.williams@example.com");
            customer4.setPhone("+1444987654");
            customer4.setCompany("Innovation Labs");
            customer4.setAddress("321 Elm St, Elsewhere, USA");
            customerRepository.save(customer4);
            
            Customer customer5 = new Customer();
            customer5.setFirstName("Charlie");
            customer5.setLastName("Brown");
            customer5.setEmail("charlie.brown@example.com");
            customer5.setPhone("+1333456789");
            customer5.setCompany("Creative Agency");
            customer5.setAddress("654 Maple Dr, Nowhere, USA");
            customerRepository.save(customer5);
            
            System.out.println("Sample customers created");
            
            // Create sample orders for the customers
            if (orderRepository.count() == 0) {
                // Get the saved customers
                java.util.List<Customer> customers = customerRepository.findAll();
                
                if (!customers.isEmpty()) {
                    // Orders for John Doe (customer1)
                    Customer john = customers.get(0);
                    
                    Order order1 = new Order("ORD-001", john, "CONFIRMED", new java.math.BigDecimal("299.99"));
                    order1.setDescription("Software License - Premium Package");
                    order1.setOrderDate(java.time.LocalDateTime.now().minusDays(5));
                    orderRepository.save(order1);
                    
                    Order order2 = new Order("ORD-002", john, "SHIPPED", new java.math.BigDecimal("149.50"));
                    order2.setDescription("Hardware Accessories");
                    order2.setOrderDate(java.time.LocalDateTime.now().minusDays(3));
                    order2.setDeliveryDate(java.time.LocalDateTime.now().plusDays(2));
                    orderRepository.save(order2);
                    
                    // Orders for Jane Smith (customer2)
                    if (customers.size() > 1) {
                        Customer jane = customers.get(1);
                        
                        Order order3 = new Order("ORD-003", jane, "PENDING", new java.math.BigDecimal("599.00"));
                        order3.setDescription("Enterprise Solution Setup");
                        order3.setOrderDate(java.time.LocalDateTime.now().minusDays(1));
                        orderRepository.save(order3);
                        
                        Order order4 = new Order("ORD-004", jane, "DELIVERED", new java.math.BigDecimal("89.99"));
                        order4.setDescription("Monthly Subscription");
                        order4.setOrderDate(java.time.LocalDateTime.now().minusDays(10));
                        order4.setDeliveryDate(java.time.LocalDateTime.now().minusDays(8));
                        orderRepository.save(order4);
                    }
                    
                    // Orders for Bob Johnson (customer3)
                    if (customers.size() > 2) {
                        Customer bob = customers.get(2);
                        
                        Order order5 = new Order("ORD-005", bob, "CONFIRMED", new java.math.BigDecimal("1299.99"));
                        order5.setDescription("Custom Development Package");
                        order5.setOrderDate(java.time.LocalDateTime.now().minusDays(7));
                        orderRepository.save(order5);
                    }
                    
                    // Order for Alice Williams (customer4)
                    if (customers.size() > 3) {
                        Customer alice = customers.get(3);
                        
                        Order order6 = new Order("ORD-006", alice, "CANCELLED", new java.math.BigDecimal("199.99"));
                        order6.setDescription("Training Package - Cancelled");
                        order6.setOrderDate(java.time.LocalDateTime.now().minusDays(2));
                        order6.setIsActive(false);
                        orderRepository.save(order6);
                    }
                    
                    System.out.println("Sample orders created");
                }
            }
        }
    }
}
