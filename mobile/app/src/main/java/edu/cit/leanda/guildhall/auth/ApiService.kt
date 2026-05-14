package edu.cit.leanda.guildhall.auth

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

// ── Request bodies ────────────────────────────────────────────────────────────

data class RegisterRequest(
    val email: String,
    val username: String,
    val password: String
)

data class LoginRequest(
    val username: String,   // backend accepts username OR email in this field
    val password: String
)

data class SkillsRequest(
    val skills: List<String>
)

// ── Response bodies ───────────────────────────────────────────────────────────

/**
 * Matches the backend's standard envelope:
 * { success, data: { token, user: { … } }, timestamp }
 */
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
    val questCount: Int
)

// ── Retrofit interface ────────────────────────────────────────────────────────

interface ApiService {

    /**
     * POST /api/v1/auth/register
     * Body: { email, username, password }
     */
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<AuthEnvelope>

    /**
     * POST /api/v1/auth/login
     * Body: { username, password }  (username field accepts email too)
     */
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<AuthEnvelope>

    /**
     * POST /api/v1/auth/skills
     * Saves skills selected on the onboarding screen.
     * Requires Bearer token in Authorization header.
     */
    @POST("auth/skills")
    suspend fun saveSkills(
        @Header("Authorization") bearerToken: String,
        @Body body: SkillsRequest
    ): Response<AuthEnvelope>

    /**
     * GET /api/v1/auth/me
     * Fetches the current user's profile from the JWT.
     */
    @GET("auth/me")
    suspend fun me(
        @Header("Authorization") bearerToken: String
    ): Response<AuthEnvelope>

    /**
     * GET /api/v1/guilds/my
     * Returns the guilds the current user has joined.
     */
    @GET("guilds/my")
    suspend fun myGuilds(
        @Header("Authorization") bearerToken: String
    ): Response<GuildsEnvelope>
}