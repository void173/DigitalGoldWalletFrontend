package com.example.DigitalGoldWalletFrontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/Member1Page1")
    public String page1() {
        return "Member1Page1";
    }

    @GetMapping("/Member1Page2")
    public String page2() {
        return "Member1Page2";
    }

    @GetMapping("/Member5Page1")
    public String page51() {
        return "Member5Page1";
    }

    @GetMapping("/Member5Page2")
    public String page52() {
        return "Member5Page2"; // dashboard.html
    }

}
