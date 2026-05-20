package edu.cit.leanda.guildhall.auth

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Header
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

/**
 * Separate Retrofit client for PayMongo payment endpoints.
 *
 * The backend maps payment routes to /api/payments/ (NOT /api/v1/payments/).
 * Using the main RetrofitClient (base = /api/v1/) would produce the wrong URL,
 * which is exactly the 500 "No static resource api/v1/payments/..." error seen in logcat.
 */
interface PaymentApiService {

    /**
     * POST /api/payments/create-session/{questId}
     * Creates a PayMongo checkout session and returns the checkout URL.
     */
    @POST("payments/create-session/{questId}")
    suspend fun createPaymentSession(
        @Header("Authorization") bearerToken: String,
        @Path("questId") questId: Long,
        @Query("platform") platform: String = "mobile"
    ): Response<PaymentSessionEnvelope>

    @GET("payments/verify/{questId}")
    suspend fun verifyPayment(
        @Header("Authorization") bearerToken: String,
        @Path("questId") questId: Long
    ): Response<SimpleEnvelope>
}

object PaymentRetrofitClient {

    // Strip /api/v1/ from the base URL — payment routes live at /api/payments/
    private val BASE_URL: String by lazy {
        RetrofitClient.serverBaseUrl + "api/"
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    val paymentApiService: PaymentApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PaymentApiService::class.java)
    }
}
