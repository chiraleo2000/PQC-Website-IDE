package com.pqc.document.repository;

import com.pqc.document.entity.Document;
import com.pqc.document.entity.Document.DocumentStatus;
import com.pqc.document.entity.Document.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.applicant LEFT JOIN FETCH d.signer WHERE d.documentId = :documentId")
    Optional<Document> findByDocumentId(@Param("documentId") String documentId);

    List<Document> findByApplicantId(Long applicantId);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.applicant LEFT JOIN FETCH d.signer WHERE d.applicant.userId = :userId")
    List<Document> findByApplicantUserId(@Param("userId") String userId);

    List<Document> findBySignerId(Long signerId);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.applicant LEFT JOIN FETCH d.signer WHERE d.status = :status")
    List<Document> findByStatus(@Param("status") DocumentStatus status);

    List<Document> findByDocumentType(DocumentType type);

    List<Document> findByApplicantIdAndStatus(Long applicantId, DocumentStatus status);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.applicant LEFT JOIN FETCH d.signer")
    List<Document> findAllWithAssociations();

    // For web controller - find user's documents
    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.applicant WHERE d.applicant = :applicant ORDER BY d.createdAt DESC")
    List<Document> findByApplicantOrderByCreatedAtDesc(@Param("applicant") com.pqc.document.entity.User applicant);

    // For transaction log API
    List<Document> findTop20ByOrderByCreatedAtDesc();
}
