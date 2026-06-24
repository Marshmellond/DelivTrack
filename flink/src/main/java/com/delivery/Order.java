package com.delivery;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

/**
 * POC 订单 POJO — Kafka JSON → Java 对象映射
 */
public class Order implements Serializable {

    @JsonProperty("order_no")
    private String orderNo;

    @JsonProperty("user_id")
    private int userId;

    @JsonProperty("merchant_name")
    private String merchantName;

    @JsonProperty("category")
    private String category;

    @JsonProperty("rider_id")
    private int riderId;

    @JsonProperty("total_amount")
    private double totalAmount;

    @JsonProperty("delivery_fee")
    private double deliveryFee;

    @JsonProperty("distance")
    private double distance;

    @JsonProperty("status")
    private String status;

    @JsonProperty("city")
    private String city;

    @JsonProperty("district")
    private String district;

    @JsonProperty("event_time")
    private long eventTime;

    // getters
    public String getOrderNo() {
        return orderNo;
    }

    public int getUserId() {
        return userId;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public String getCategory() {
        return category;
    }

    public int getRiderId() {
        return riderId;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public double getDeliveryFee() {
        return deliveryFee;
    }

    public double getDistance() {
        return distance;
    }

    public String getStatus() {
        return status;
    }

    public String getCity() {
        return city;
    }

    public String getDistrict() {
        return district;
    }

    public long getEventTime() {
        return eventTime;
    }
}
