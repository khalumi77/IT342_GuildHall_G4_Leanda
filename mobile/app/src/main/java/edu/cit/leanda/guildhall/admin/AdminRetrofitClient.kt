package edu.cit.leanda.guildhall.admin

import edu.cit.leanda.guildhall.auth.ApiError
import edu.cit.leanda.guildhall.auth.RetrofitClient
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

// ── Response DTOs ─────────────────────────────────────────────────────────────

data class AdminUserDto(
    val id: Long,
    val username: String,
    val email: String,
    val role: String,
    val level: Int,
    val xp: Int,
    val rank: String?,
    val profilePictureUrl: String?,
    val skills: List<String>? = null,
    val bio: String? = null,
    val googleSub: String? = null
)

data class AdminUsersEnvelope(
    val success: Boolean,
    val data: List<AdminUserDto>?,
    val error: ApiError?,
    val timestamp: String?
)

data class AdminUserEnvelope(
    val success: Boolean,
    val data: AdminUserDto?,
    val error: ApiError?,
    val timestamp: String?
)

data class CreateGuildRequest(
    val name: String,
    val description: String
)

data class AdminGuildEnvelope(
    val success: Boolean,
    val data: AdminGuildDto?,
    val error: ApiError?,
    val timestamp: String?
)

data class AdminGuildDto(
    val id: Long,
    val name: String,
    val description: String?,
    val memberCount: Int,
    val questCount: Int
)

data class AdminGuildsEnvelope(
    val success: Boolean,
    val data: List<AdminGuildDto>?,
    val error: ApiError?,
    val timestamp: String?
)

data class AdminSimpleEnvelope(
    val success: Boolean,
    val data: Any?,
    val error: ApiError?,
    val timestamp: String?
)

// ── Retrofit interface ────────────────────────────────────────────────────────

interface AdminApiService {

    @GET("admin/users")
    suspend fun getUsers(
        @Header("Authorization") bearerToken: String
    ): Response<AdminUsersEnvelope>

    @GET("admin/users/{id}")
    suspend fun getUser(
        @Header("Authorization") bearerToken: String,
        @Path("id") userId: Long
    ): Response<AdminUserEnvelope>

    @GET("admin/guilds")
    suspend fun getGuilds(
        @Header("Authorization") bearerToken: String
    ): Response<AdminGuildsEnvelope>

    @POST("admin/guilds")
    suspend fun createGuild(
        @Header("Authorization") bearerToken: String,
        @Body body: CreateGuildRequest
    ): Response<AdminGuildEnvelope>

    @DELETE("admin/guilds/{id}")
    suspend fun deleteGuild(
        @Header("Authorization") bearerToken: String,
        @Path("id") guildId: Long
    ): Response<AdminSimpleEnvelope>

    @POST("admin/users/{id}/ban")
    suspend fun banUser(
        @Header("Authorization") bearerToken: String,
        @Path("id") userId: Long
    ): Response<AdminSimpleEnvelope>
}

// ── Singleton client ──────────────────────────────────────────────────────────

object AdminRetrofitClient {

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Re-use the same base URL as the main client (/api/v1/)
    val adminApiService: AdminApiService by lazy {
        Retrofit.Builder()
            .baseUrl(RetrofitClient.serverBaseUrl + "api/v1/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AdminApiService::class.java)
    }
}
