package com.pqc.messaging.entity;

import com.pqc.model.CryptoAlgorithm;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for encrypted messages.
 */
@Entity
@Table(name = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", unique = true, nullable = false)
    private String messageId;

    @Column(name = "sender_id")
    private String senderId;

    @Column(name = "recipient_id")
    private String recipientId;

    private String subject;

    // Encrypted content
    @Lob
    @Column(name = "encrypted_content")
    private byte[] encryptedContent;

    @Lob
    @Column(name = "encapsulated_key")
    private byte[] encapsulatedKey;

    @Lob
    private byte[] iv;

    // Encryption details
    @Enumerated(EnumType.STRING)
    @Column(name = "encryption_algorithm")
    private CryptoAlgorithm encryptionAlgorithm;

    // Status
    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @Column(name = "is_decrypted")
    @Builder.Default
    private boolean decrypted = false;

    // Harvest tracking (for HNDL demo)
    @Column(name = "is_harvested")
    @Builder.Default
    private boolean harvested = false;

    @Column(name = "harvested_at")
    private LocalDateTime harvestedAt;

    @Column(name = "harvested_by")
    private String harvestedBy;

    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
