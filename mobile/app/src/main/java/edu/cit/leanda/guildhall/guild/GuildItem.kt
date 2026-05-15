package edu.cit.leanda.guildhall.guild

data class GuildItem(
    val id: Long,
    val name: String,
    val description: String,
    val memberCount: Int,
    val questCount: Int
)