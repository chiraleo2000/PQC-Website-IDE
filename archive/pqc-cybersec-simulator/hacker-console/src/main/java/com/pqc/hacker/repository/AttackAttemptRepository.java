package com.pqc.hacker.repository;

import com.pqc.hacker.entity.AttackAttempt;
import com.pqc.hacker.entity.AttackAttempt.AttackStatus;
import com.pqc.hacker.entity.AttackAttempt.AttackType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttackAttemptRepository extends JpaRepository<AttackAttempt, Long> {

    Optional<AttackAttempt> findByAttemptId(String attemptId);

    List<AttackAttempt> findByAttackType(AttackType type);

    List<AttackAttempt> findByStatus(AttackStatus status);

    List<AttackAttempt> findByHarvestedDataId(Long harvestedDataId);

    long countByStatus(AttackStatus status);

    @Query("SELECT a FROM AttackAttempt a LEFT JOIN FETCH a.harvestedData ORDER BY a.attemptedAt DESC LIMIT 10")
    List<AttackAttempt> findTop10ByOrderByAttemptedAtDesc();
}
