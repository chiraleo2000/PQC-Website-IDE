package com.pqc.hacker.repository;

import com.pqc.hacker.entity.HarvestedData;
import com.pqc.hacker.entity.HarvestedData.HarvestStatus;
import com.pqc.model.CryptoAlgorithm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HarvestedDataRepository extends JpaRepository<HarvestedData, Long> {

    Optional<HarvestedData> findByHarvestId(String harvestId);
    
    Optional<HarvestedData> findByTargetId(String targetId);
    
    boolean existsByTargetId(String targetId);

    List<HarvestedData> findByStatus(HarvestStatus status);

    List<HarvestedData> findByIsQuantumResistantFalse();

    List<HarvestedData> findByIsQuantumResistantTrue();

    List<HarvestedData> findByAlgorithm(CryptoAlgorithm algorithm);

    List<HarvestedData> findBySourceService(String sourceService);

    List<HarvestedData> findByStatusAndIsQuantumResistantFalse(HarvestStatus status);

    long countByIsQuantumResistantFalse();

    long countByIsQuantumResistantTrue();

    long countByStatus(HarvestStatus status);

    @Query("SELECT MIN(h.harvestedAt) FROM HarvestedData h")
    LocalDateTime findOldestHarvestDate();

    @Query("SELECT h FROM HarvestedData h WHERE h.status = 'HARVESTED' AND h.isQuantumResistant = false")
    List<HarvestedData> findPendingQuantumAttacks();
}
