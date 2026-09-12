plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.hydroengineer.boardgaminghub.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.hydroengineer.boardgaminghub.tv"
        // Fire TV Stick (2nd gen) and Fire TV (2nd gen) run Fire OS 5 = API 22.
        // Everything newer (Fire OS 6/7/8) is API 25/28/32.
        minSdk = 22
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            // No shrinking: the app is one activity with no dependencies, so
            // R8 would buy nothing and only risk stripping the JavascriptInterface.
            isMinifyEnabled = false
        }
        debug {
            // Debug builds are what people sideload before a keystore exists,
            // so give them their own id and let both sit on the device at once.
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    // Release signing is supplied by CI from repository secrets. Without them
    // the release variant stays unsigned and the workflow ships the debug APK,
    // which sideloads onto Fire TV perfectly well.
    val storeFilePath = System.getenv("BGHTV_KEYSTORE")
    if (!storeFilePath.isNullOrBlank()) {
        signingConfigs {
            create("release") {
                storeFile = file(storeFilePath)
                storePassword = System.getenv("BGHTV_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("BGHTV_KEY_ALIAS")
                keyPassword = System.getenv("BGHTV_KEY_PASSWORD")
            }
        }
        buildTypes.getByName("release").signingConfig = signingConfigs.getByName("release")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // The whole app is one activity; no resource shrinking, no build features.
    buildFeatures {
        buildConfig = false
    }
}

// Deliberately no dependencies. Not AndroidX, not Leanback. A Fire TV launcher
// entry needs an intent filter and a banner, not a support library, and every
// dependency dropped is one less thing that can break a headless CI build.
dependencies { }
