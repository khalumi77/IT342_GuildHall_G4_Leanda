package edu.cit.leanda.guildhall.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class SkillsRequest {
    private List<String> skills;
}
