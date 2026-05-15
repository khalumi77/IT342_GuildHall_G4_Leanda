package edu.cit.leanda.guildhall.guild

data class BrowseGuildItem(
    val id: Long,
    val name: String,
    val description: String,
    val memberCount: Int,
    val questCount: Int,
    val isMember: Boolean
)