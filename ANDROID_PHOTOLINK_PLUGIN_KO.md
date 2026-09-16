# Android(Capacitor) PhotoLink 플러그인 — 인터페이스 사양 (v7.6.0)

웹 앱은 `window.Capacitor.Plugins.PhotoLink`가 있으면 이것을 쓰고, 없으면 웹 fallback(세션 한정 보기)으로 동작합니다.
**STEP 6(Capacitor 프로젝트 생성)에서 아래 사양 그대로 Kotlin 파일 1개로 구현합니다. 지금 단계에서는 만들지 않습니다.**

## 웹 ↔ 네이티브 계약

```ts
interface PhotoLinkPlugin {
  /** 시스템 Photo Picker를 띄우고 선택한 사진의 '영구 참조'를 돌려준다. 사진 파일은 복사하지 않는다. */
  pick(opts: { max: number }): Promise<{ items: { uri: string; name: string; size: number; mime: string }[] }>;
  /** 참조(uri)를 시스템 뷰어(갤러리/Google Photos)로 연다. 실패 시 reject. */
  open(opts: { uri: string }): Promise<void>;
}
```

## Android 구현 요점 (공식 문서 기준, 2026-09)

| 항목 | 구현 | 근거 |
|---|---|---|
| 선택기 | `ActivityResultContracts.PickMultipleVisualMedia(max)` + `PickVisualMediaRequest(PickVisualMedia.ImageOnly)` (androidx.activity ≥ 1.7.0) | developer.android.com/training/data-storage/shared/photo-picker |
| Picker 미탑재 기기 | 라이브러리가 자동으로 `ACTION_OPEN_DOCUMENT`로 대체 — 별도 코드 없음 | 같은 문서 "Device availability" |
| 영구 접근 | 반환된 각 URI에 `contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)` | 같은 문서 "Persist media file access" (기본은 재부팅/앱 종료 시 만료) |
| 메타 | `contentResolver.query(uri, [DISPLAY_NAME, SIZE])`, `getType(uri)` | |
| 열기 | `Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).addFlags(FLAG_GRANT_READ_URI_PERMISSION)` → `startActivity` (`ActivityNotFoundException`/`SecurityException` → reject) | |
| 권한 | **매니페스트 권한 추가 없음** (`READ_MEDIA_IMAGES`, `CAMERA`, 저장소 권한 미사용) | Photo Picker는 런타임 권한 불필요 |
| 영구 권한 한도 | 앱당 512개(Android 11+). `contentResolver.persistedUriPermissions.size ≥ 500`이면 가장 오래된 것부터 `releasePersistableUriPermission` | |
| 비용 | 0 (플랫폼 API) | |

## Kotlin 골격 (참고용, STEP 6에서 사용)

```kotlin
@CapacitorPlugin(name = "PhotoLink")
class PhotoLinkPlugin : Plugin() {
  @PluginMethod fun pick(call: PluginCall) {
    val max = call.getInt("max") ?: 10
    val intent = ActivityResultContracts.PickMultipleVisualMedia(max)
      .createIntent(context, PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
    startActivityForResult(call, intent, "onPicked")
  }
  @ActivityCallback fun onPicked(call: PluginCall, result: ActivityResult) {
    val uris = ActivityResultContracts.PickMultipleVisualMedia(10).parseResult(result.resultCode, result.data)
    val items = JSArray()
    for (u in uris) {
      try { context.contentResolver.takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: SecurityException) {}
      // query DISPLAY_NAME/SIZE, getType → JSObject{uri,name,size,mime}
    }
    call.resolve(JSObject().put("items", items))
  }
  @PluginMethod fun open(call: PluginCall) {
    val uri = Uri.parse(call.getString("uri") ?: return call.reject("no uri"))
    try {
      val i = Intent(Intent.ACTION_VIEW).setDataAndType(uri, context.contentResolver.getType(uri) ?: "image/*")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(i); call.resolve()
    } catch (e: Exception) { call.reject("cannot open", e) }
  }
}
```

## 저장되는 것 / 저장되지 않는 것

- 저장 O: `sk.photolinks` → `{ "p<id>": { uri, name, size, mime, added } }` (장당 ≈ 150–250 byte). Vault 노트용은 Vault 암호문 안.
- 저장 X: 사진 파일, base64, BLOB, 썸네일, 업로드. 노트 본문에는 `<a class="plink" data-pid="…">🖼 이름</a>`만.
