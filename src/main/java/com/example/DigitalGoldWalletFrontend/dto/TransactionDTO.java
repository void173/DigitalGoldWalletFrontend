package com.example.DigitalGoldWalletFrontend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TransactionDTO {
    private Integer transactionId;
    private BigDecimal quantity;
    private BigDecimal amount;
    private String transactionType;
    private LocalDateTime createdAt;

    private String vendorName;
    private String branchAddress;
}
