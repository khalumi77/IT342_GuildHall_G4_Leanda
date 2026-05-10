package edu.cit.leanda.guildhall.features.auth.dto;

import lombok.Data;
import java.util.List;

@Data
public class SkillsRequest {
    private List<String> skills;
}

