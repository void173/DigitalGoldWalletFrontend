package com.example.DigitalGoldWalletFrontend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class HoldingDTO {
    private Integer holdingId;
    private BigDecimal quantity;
    private LocalDateTime createdAt;
    private Integer branchId;
}