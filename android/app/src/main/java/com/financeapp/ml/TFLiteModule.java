package com.financeapp.ml;

import android.content.Context;
import android.content.res.AssetFileDescriptor;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import org.tensorflow.lite.Interpreter;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * TFLite bridge: loads sms_classifier.tflite from assets and runs text classification.
 *
 * Expected model I/O:
 *   Input:  float[1][256]  — token IDs (padded / truncated to 256)
 *   Output: float[1][N]    — class probabilities, where N = number of categories
 *
 * The label_map.txt file maps line index → category_id.
 */
public class TFLiteModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "TFLiteModule";
    private static final String MODEL_PATH  = "ml/sms_classifier.tflite";
    private static final String LABEL_PATH  = "ml/label_map.txt";
    private static final int    MAX_TOKENS  = 256;

    private Interpreter interpreter;
    private List<String> labels = new ArrayList<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean initialized = false;

    public TFLiteModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initialize(Promise promise) {
        executor.execute(() -> {
            try {
                if (!initialized) {
                    Context ctx = getReactApplicationContext();
                    MappedByteBuffer modelBuffer = loadModelFile(ctx);
                    interpreter = new Interpreter(modelBuffer);
                    labels = loadLabels(ctx);
                    initialized = true;
                }
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("TFLITE_INIT_ERROR", e.getMessage(), e);
            }
        });
    }

    /**
     * Classify SMS body text.
     * @param smsBody    Raw SMS string
     * @param promise    Resolves to {categoryId: string, confidence: number, merchantType: string}
     */
    @ReactMethod
    public void classify(String smsBody, Promise promise) {
        if (!initialized) {
            promise.reject("TFLITE_NOT_INIT", "Call initialize() first");
            return;
        }
        executor.execute(() -> {
            try {
                float[][] input  = tokenize(smsBody);
                float[][] output = new float[1][labels.size()];
                interpreter.run(input, output);

                int bestIdx = 0;
                float bestScore = output[0][0];
                for (int i = 1; i < output[0].length; i++) {
                    if (output[0][i] > bestScore) {
                        bestScore = output[0][i];
                        bestIdx = i;
                    }
                }

                String categoryId = bestIdx < labels.size() ? labels.get(bestIdx) : "cat_other";
                String merchantType = inferMerchantType(smsBody);

                WritableMap result = Arguments.createMap();
                result.putString("categoryId",    categoryId);
                result.putDouble("confidence",    bestScore);
                result.putString("merchantType",  merchantType);
                promise.resolve(result);
            } catch (Exception e) {
                promise.reject("TFLITE_CLASSIFY_ERROR", e.getMessage(), e);
            }
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private MappedByteBuffer loadModelFile(Context ctx) throws Exception {
        AssetFileDescriptor fd = ctx.getAssets().openFd(MODEL_PATH);
        FileInputStream fis = new FileInputStream(fd.getFileDescriptor());
        FileChannel channel = fis.getChannel();
        return channel.map(FileChannel.MapMode.READ_ONLY, fd.getStartOffset(), fd.getDeclaredLength());
    }

    private List<String> loadLabels(Context ctx) throws Exception {
        List<String> result = new ArrayList<>();
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(ctx.getAssets().open(LABEL_PATH))
        );
        String line;
        while ((line = reader.readLine()) != null) {
            result.add(line.trim());
        }
        reader.close();
        return result;
    }

    /**
     * Minimal character-level tokenizer: each char → its Unicode code point, padded to MAX_TOKENS.
     * Replace with a proper BPE/word tokenizer matching model training.
     */
    private float[][] tokenize(String text) {
        float[][] tokens = new float[1][MAX_TOKENS];
        String lower = text.toLowerCase();
        int len = Math.min(lower.length(), MAX_TOKENS);
        for (int i = 0; i < len; i++) {
            tokens[0][i] = lower.charAt(i);
        }
        return tokens;
    }

    private String inferMerchantType(String body) {
        String lower = body.toLowerCase();
        // Person indicators: "to <Name>", "from <Name>", UPI person patterns
        if (lower.contains(" to ") || lower.contains(" from ") ||
            lower.matches(".*paid by [a-z].*") || lower.contains("@upi")) {
            // Refined by JS MerchantDetector; this is a coarse signal
            return "unknown";
        }
        return "unknown";
    }

    @Override
    public void invalidate() {
        executor.shutdown();
        if (interpreter != null) interpreter.close();
        super.invalidate();
    }
}
