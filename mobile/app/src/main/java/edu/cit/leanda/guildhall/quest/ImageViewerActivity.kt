package edu.cit.leanda.guildhall.quest

import android.content.Context
import android.graphics.Matrix
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity

class ImageViewerActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val image = ZoomImageView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundColor(android.graphics.Color.BLACK)
            scaleType = ImageView.ScaleType.MATRIX
        }
        setContentView(image)
        intent.getStringExtra("imageData")?.let { data ->
            val raw = data.substringAfter(",", data)
            val bytes = Base64.decode(raw, Base64.DEFAULT)
            image.setImageBitmap(BitmapFactory.decodeByteArray(bytes, 0, bytes.size))
        }
        image.setOnClickListener { finish() }
    }

    class ZoomImageView(context: Context) : ImageView(context) {
        private val matrixValues = Matrix()
        private val detector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val next = (scale * detector.scaleFactor).coerceIn(1f, 5f)
                val factor = next / scale
                scale = next
                matrixValues.postScale(factor, factor, detector.focusX, detector.focusY)
                imageMatrix = matrixValues
                return true
            }
        })
        private var lastX = 0f
        private var lastY = 0f
        private var dragging = false
        private var scale = 1f

        override fun setImageBitmap(bm: android.graphics.Bitmap?) {
            super.setImageBitmap(bm)
            post { fitCenter() }
        }

        override fun onTouchEvent(event: MotionEvent): Boolean {
            detector.onTouchEvent(event)
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    lastX = event.x
                    lastY = event.y
                    dragging = true
                }
                MotionEvent.ACTION_MOVE -> if (dragging && scale > 1f && event.pointerCount == 1) {
                    matrixValues.postTranslate(event.x - lastX, event.y - lastY)
                    imageMatrix = matrixValues
                    lastX = event.x
                    lastY = event.y
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> dragging = false
                MotionEvent.ACTION_POINTER_UP -> {
                    lastX = event.x
                    lastY = event.y
                }
            }
            return true
        }

        private fun fitCenter() {
            val d = drawable ?: return
            val viewW = width.toFloat()
            val viewH = height.toFloat()
            val drawableW = d.intrinsicWidth.toFloat()
            val drawableH = d.intrinsicHeight.toFloat()
            if (viewW <= 0f || viewH <= 0f || drawableW <= 0f || drawableH <= 0f) return
            val baseScale = minOf(viewW / drawableW, viewH / drawableH)
            val dx = (viewW - drawableW * baseScale) / 2f
            val dy = (viewH - drawableH * baseScale) / 2f
            matrixValues.reset()
            matrixValues.postScale(baseScale, baseScale)
            matrixValues.postTranslate(dx, dy)
            imageMatrix = matrixValues
            scale = 1f
        }
    }
}
