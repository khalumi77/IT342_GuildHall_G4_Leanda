package edu.cit.leanda.guildhall.auth

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

// ── Request bodies ────────────────────────────────────────────────────────────

data class RegisterRequest(
    val email: String,
    val username: String,
    val password: String
)

data class LoginRequest(
    val username: String,
    val password: String
)

data class SkillsRequest(
    val skills: List<String>
)

// ── Response bodies ───────────────────────────────────────────────────────────

data class AuthEnvelope(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)

data class AuthData(
    val success: Boolean,
    val token: String?,
    val user: UserDto?
)

data class UserDto(
    val id: Long,
    val email: String,
    val username: String,
    val role: String,
    val level: Int,
    val xp: Int,
    val rank: String?,
    val skills: List<String>?,
    val newUser: Boolean,
    val bio: String?,
    val profilePictureUrl: String?,
    val googleSub: String?
)

data class ApiError(
    val code: String?,
    val message: String?,
    val details: Any?
)

// ── Generic envelope for simple success/error responses ───────────────────────

data class SimpleEnvelope(
    val success: Boolean,
    val data: Any?,
    val error: ApiError?,
    val timestamp: String?
)

// ── Guild response bodies ─────────────────────────────────────────────────────

data class GuildsEnvelope(
    val success: Boolean,
    val data: List<GuildDto>?,
    val error: ApiError?,
    val timestamp: String?
)

data class GuildDto(
    val id: Long,
    val name: String,
    val description: String?,
    val memberCount: Int,
    val questCount: Int,
    val isMember: Boolean?        // present on /guilds (all), absent on /guilds/my
)

// ── Quest response bodies ─────────────────────────────────────────────────────

data class QuestsEnvelope(
    val success: Boolean,
    val data: List<QuestDto>?,
    val error: ApiError?,
    val timestamp: String?
)

data class QuestDto(
    val id: Long,
    val title: String,
    val category: String,
    val description: String,
    val questType: String,          // "VOLUNTEER" | "PAID"
    val reward: Double?,
    val xpReward: Int,
    val status: String,             // "OPEN" | "PENDING" | "COMPLETED" | "PENDING_PAYMENT"
    val postedBy: String,
    val posterId: Long,
    val createdAt: String?,
    val attachmentName: String?,
    val attachmentData: String?,
    val helperUsername: String?,
    val helperId: Long?,
    val acceptedByMe: Boolean?,
    // Extra fields present on /quests/mine and /quests/accepted
    val guildId: Long?,
    val guildName: String?,
    val helperUsernameAlt: String?  // helperUsername from /quests/mine extra map
)

data class QuestEnvelope(
    val success: Boolean,
    val data: QuestDto?,
    val error: ApiError?,
    val timestamp: String?
)

// ── Retrofit interface ────────────────────────────────────────────────────────

interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────────

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthEnvelope>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthEnvelope>

    @POST("auth/skills")
    suspend fun saveSkills(
        @Header("Authorization") bearerToken: String,
        @Body body: SkillsRequest
    ): Response<AuthEnvelope>

    @GET("auth/me")
    suspend fun me(
        @Header("Authorization") bearerToken: String
    ): Response<AuthEnvelope>

    // ── Guilds ────────────────────────────────────────────────────────────────

    /** GET /guilds/my — guilds the user has joined */
    @GET("guilds/my")
    suspend fun myGuilds(
        @Header("Authorization") bearerToken: String
    ): Response<GuildsEnvelope>

    /** GET /guilds — ALL guilds (for Browse screen) */
    @GET("guilds")
    suspend fun allGuilds(
        @Header("Authorization") bearerToken: String
    ): Response<GuildsEnvelope>

    /** POST /guilds/{id}/join */
    @POST("guilds/{id}/join")
    suspend fun joinGuild(
        @Header("Authorization") bearerToken: String,
        @Path("id") guildId: Long
    ): Response<SimpleEnvelope>

    /** DELETE /guilds/{id}/leave */
    @DELETE("guilds/{id}/leave")
    suspend fun leaveGuild(
        @Header("Authorization") bearerToken: String,
        @Path("id") guildId: Long
    ): Response<SimpleEnvelope>

    // ── Quests ────────────────────────────────────────────────────────────────

    /** GET /guilds/{guildId}/quests */
    @GET("guilds/{guildId}/quests")
    suspend fun getQuests(
        @Header("Authorization") bearerToken: String,
        @Path("guildId") guildId: Long
    ): Response<QuestsEnvelope>

    /** POST /guilds/{guildId}/quests/{questId}/accept */
    @POST("guilds/{guildId}/quests/{questId}/accept")
    suspend fun acceptQuest(
        @Header("Authorization") bearerToken: String,
        @Path("guildId") guildId: Long,
        @Path("questId") questId: Long
    ): Response<QuestEnvelope>

    /** POST /guilds/{guildId}/quests/{questId}/complete */
    @POST("guilds/{guildId}/quests/{questId}/complete")
    suspend fun completeQuest(
        @Header("Authorization") bearerToken: String,
        @Path("guildId") guildId: Long,
        @Path("questId") questId: Long
    ): Response<QuestEnvelope>

    /** DELETE /guilds/{guildId}/quests/{questId} */
    @DELETE("guilds/{guildId}/quests/{questId}")
    suspend fun deleteQuest(
        @Header("Authorization") bearerToken: String,
        @Path("guildId") guildId: Long,
        @Path("questId") questId: Long
    ): Response<SimpleEnvelope>

    /** GET /quests/mine — quests the user has commissioned */
    @GET("quests/mine")
    suspend fun myCommissionedQuests(
        @Header("Authorization") bearerToken: String
    ): Response<QuestsEnvelope>

    /** GET /quests/accepted — quests the user has accepted */
    @GET("quests/accepted")
    suspend fun myAcceptedQuests(
        @Header("Authorization") bearerToken: String
    ): Response<QuestsEnvelope>
}