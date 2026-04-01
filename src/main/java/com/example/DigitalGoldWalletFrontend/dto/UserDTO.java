package com.example.DigitalGoldWalletFrontend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UserDTO {
    private Integer userId;
    private String name;
    private String email;
    private BigDecimal balance;
    private AddressDTO address;
}
