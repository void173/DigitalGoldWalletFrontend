package com.example.DigitalGoldWalletFrontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

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
        return "Member5Page2";
    }
    @GetMapping("/Member3Page1")
    public String member3Page1() {
        return "Member3Page1"; // NO .html
    }
    @GetMapping("/Member3Page2")
    public String member3Page2(@RequestParam(required = true) Integer id) {
        return "Member3Page2";
    }

}
