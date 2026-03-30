package edu.cit.leanda.guildhall.network

import retrofit2.Response
import retrofit2.http.Body
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

data class GoogleLoginRequest(
    val idToken: String
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
     * POST /api/v1/auth/google
     * Body: { idToken }
     */
    @POST("auth/google")
    suspend fun googleLogin(@Body body: GoogleLoginRequest): Response<AuthEnvelope>
}