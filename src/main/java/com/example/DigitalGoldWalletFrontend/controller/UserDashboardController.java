package com.example.DigitalGoldWalletFrontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/dashboard")
public class UserDashboardController {

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/{userId}")
    public String dashboard(@PathVariable Integer userId, Model model) {

        String base = "http://172.16.160.128:8080";

        // 1. USER
        Map user = restTemplate.getForObject(base + "/users/" + userId, Map.class);

        Map links = (Map) user.get("_links");

        // 2. ADDRESS
        String addressUrl = ((Map) links.get("address")).get("href").toString();
        Map address = restTemplate.getForObject(addressUrl, Map.class);

        // 3. HOLDINGS
        String holdingsUrl = ((Map) links.get("virtualGoldHoldings")).get("href").toString();
        Map holdingsRes = restTemplate.getForObject(holdingsUrl, Map.class);

        List<Map> holdings = (List<Map>) ((Map) holdingsRes.get("_embedded")).get("virtualGoldHoldings");

        // calculate total gold
        double totalGold = holdings.stream()
                .mapToDouble(h -> Double.parseDouble(h.get("quantity").toString()))
                .sum();

        // 4. TRANSACTIONS
        String txnUrl = ((Map) links.get("transactions")).get("href").toString();
        Map txnRes = restTemplate.getForObject(txnUrl, Map.class);

        List<Map> transactions = (List<Map>) ((Map) txnRes.get("_embedded")).get("transaction");

        // 🔥 Resolve branch + vendor + address
        for (Map txn : transactions) {

            Map txnLinks = (Map) txn.get("_links");

            String branchUrl = ((Map) txnLinks.get("branch")).get("href").toString();

            Map branch = restTemplate.getForObject(branchUrl, Map.class);

            // vendor
            Map branchLinks = (Map) branch.get("_links");
            String vendorUrl = ((Map) branchLinks.get("vendors")).get("href").toString();
            Map vendor = restTemplate.getForObject(vendorUrl, Map.class);

            // branch address
            String branchAddressUrl = ((Map) branchLinks.get("address")).get("href").toString();
            Map branchAddress = restTemplate.getForObject(branchAddressUrl, Map.class);

            txn.put("vendorName", vendor.get("vendorName"));
            txn.put("branchCity", branchAddress.get("city"));
        }

        // send to thymeleaf
        model.addAttribute("user", user);
        model.addAttribute("address", address);
        model.addAttribute("holdings", holdings);
        model.addAttribute("transactions", transactions);
        model.addAttribute("totalGold", totalGold);

        return "dashboard";
    }
}
