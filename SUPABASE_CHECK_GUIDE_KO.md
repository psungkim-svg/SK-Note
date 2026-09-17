# Supabase 대시보드에서 DB 구조 확인하기 (읽기 전용 · 초보자용)

이 안내는 **아무것도 바꾸지 않습니다.** 보기만 하고, 보이는 내용을 복사(또는 캡처)해서 보내 주세요.
어떤 화면에서든 **Save / Run / Delete / Apply / Enable / Disable** 버튼은 누르지 마세요.

준비: https://supabase.com/dashboard 로그인 → 프로젝트(soonenote 쓰는 프로젝트) 클릭.
왼쪽 세로 메뉴 아이콘: 🏠 Home · 🗂 Table Editor · 🧩 SQL Editor · 🛢 Database · 🔐 Authentication · 📦 Storage · ⚡ Edge Functions · 📡 Realtime · 📊 Reports … 화면 폭이 좁으면 아이콘만 보이고, 마우스를 올리면 이름이 뜹니다.

---

## 0. 프로젝트가 Active인지 (30초)
1. 왼쪽 메뉴 맨 위 **Home**.
2. 화면 위쪽에 노란/빨간 배너로 **"Project is paused"** 또는 **"Restore project"** 버튼이 보이면 → Pause 상태.
   아무 배너 없이 프로젝트 이름과 그래프가 보이면 → Active.
3. 보내 줄 것: "배너 없음" 또는 배너 문구 그대로.

---

## 1. notes / folders 의 실제 컬럼과 타입 (Table Editor)
1. 왼쪽 메뉴 **Table Editor** 클릭.
2. 왼쪽 목록에서 스키마가 `public`인지 확인(위쪽 드롭다운) → 표 목록에서 **notes** 클릭.
3. 표가 열리면 **맨 위 제목 줄(컬럼 이름들)** 을 보세요. 각 컬럼 이름 오른쪽/아래에 작은 회색 글씨로 타입이 보입니다 (예: `id text`, `updated_at int8`, `deleted bool`).
   - 안 보이면: 컬럼 이름 위에 마우스를 올리거나, 컬럼 이름 옆 **▾** → **Edit column** 을 눌러 타입만 확인하고 **Cancel** 로 닫습니다(절대 Save 아님).
4. **보내 줄 것 (notes)**: 컬럼 이름과 타입 전부. 특히
   `id`, `user_id`, `updated_at`, `created_at`, `remind_at`(있는지), `deleted`, `version`(있는지), `server_updated_at`(있는지), `locked`, `items`, `sort_index`, `color`, `type`, `folder`, `title`, `content`
   - 타입 표기 참고: `int8` = bigint(정상), `timestamptz` = 시간형(앱과 불일치 → 보고 필요), `numeric`/`float8` 도 알려 주세요.
5. 같은 방법으로 **folders** 표도 열어 컬럼 이름·타입 전부 보내 주세요.
   - 가장 쉬운 방법: 표가 열린 상태에서 **화면 전체 캡처** 2장(notes, folders). 컬럼이 오른쪽으로 잘리면 가로 스크롤해서 한 장 더.

---

## 2. PK(기본키)와 제약조건
1. Table Editor에서 **notes** 표 열린 상태.
2. 컬럼 제목 줄에서 **열쇠 🔑 아이콘**이 붙은 컬럼이 기본키입니다 (`id`에 있어야 정상).
3. 더 확실히: 왼쪽 표 목록에서 **notes** 이름 옆 **⋯(점 3개)** → **Edit table** 클릭 → 컬럼 목록에서 **Primary** 체크된 컬럼, `user_id` 행 오른쪽의 **⚙(톱니)** 를 눌러 **Foreign key**(auth.users 연결) 여부만 보고 → **Cancel** 로 닫기.
4. 추가 확인(선택): 왼쪽 메뉴 **Database → Indexes** (표 선택 `notes`) — 인덱스 이름 목록 캡처. `Database → Tables` 에서 notes 행을 클릭하면 컬럼/타입/PK를 한 번에 보여주는 화면도 있습니다(여기가 더 편하면 이 화면 캡처로 1·2번을 대신해도 됩니다).
5. **보내 줄 것**: PK 컬럼 이름, `user_id`의 FK 여부, `folders`도 동일.

---

## 3. 기존 Trigger
1. 왼쪽 메뉴 **Database** 클릭 → 하위 메뉴에서 **Triggers**.
2. 위쪽 **schema** 드롭다운이 `public` 인지 확인.
3. 목록에 나오는 모든 트리거의 **Name / Table / Function / Events(INSERT·UPDATE…) / Orientation(ROW/STATEMENT)** 를 보내 주세요. **"No triggers created yet"** 이면 그 문구 그대로.
4. 같은 화면에서 **Database → Functions** 도 열어, 목록의 함수 이름들만 보내 주세요(있다면). 아무 함수도 열어서 수정하지 마세요.

---

## 4. RLS 활성화 여부와 정책
1. 왼쪽 메뉴 **Authentication** → 하위 **Policies** (또는 **Database → Policies**; 버전에 따라 위치가 다릅니다).
2. `public` 스키마의 표 목록이 나옵니다. **notes** 와 **folders** 각각에 대해:
   - 표 이름 옆에 **"RLS enabled"**(초록) 인지 **"RLS disabled"**(빨강/회색) 인지
   - 그 아래 나열된 **정책(policy) 이름**, 각 정책의 **Command(ALL/SELECT/INSERT/UPDATE/DELETE)** 와 **Target roles**
   - 정책 이름을 클릭하면 조건식(`auth.uid() = user_id` 같은 문장)이 보입니다 → 그 문장을 복사. 편집 창이 열리면 **Cancel**.
3. **보내 줄 것**: notes/folders 의 RLS 상태 + 정책 이름·명령·조건식. "No policies created yet" 이면 그 문구.

---

## 5. Realtime 설정
1. 왼쪽 메뉴 **Database** → **Publications**.
2. 목록에서 **supabase_realtime** 행을 찾고 그 행의 **Insert / Update / Delete / Truncate** 토글 상태(켜짐/꺼짐)를 확인.
3. 같은 행 오른쪽의 **"N tables"**(예: `2 tables`) 글자를 클릭 → 표 목록이 열리고 각 표 옆에 토글이 있습니다. **notes / folders 토글이 켜져 있는지**만 확인(토글을 건드리지 마세요).
4. **보내 줄 것**: supabase_realtime 이 켜진 표 이름, notes/folders 포함 여부.
   (참고: 왼쪽 메뉴 **Realtime → Inspector** 는 테스트용이라 필요 없습니다.)

---

## 6. notes의 현재 데이터 상태
1. **Table Editor → notes**.
2. 표 오른쪽 위(또는 아래)에 **총 행 수**가 표시됩니다 (예: `123 rows`). 이 숫자.
3. 삭제표시 개수: 컬럼 제목 줄 위의 **Filter** 버튼 → `deleted` · `is` · `true` 로 필터 추가 → 표시되는 행 수 → 확인 후 필터 **Clear/제거** (데이터가 아니라 보기 조건만 바뀝니다).
4. `updated_at` 값의 모양: 컬럼 제목 **updated_at** 클릭 → **Sort descending** → 맨 위 값 하나, **Sort ascending** → 맨 위 값 하나를 복사.
   - 예 `1789609869571` 처럼 13자리 숫자 = ms 정수(정상). `2026-09-16 10:22:33+00` 처럼 날짜 문자열이면 timestamptz(보고 필요).
5. `user_id` 가 몇 종류인지(Filter 없이 스크롤로 대충): 본인 계정 하나만 쓰면 1개일 것입니다.
6. **보내 줄 것**: 총 행 수, deleted=true 행 수, updated_at 최대·최소 값, created_at 최대·최소 값(같은 방법), user_id 종류 수.
   - 노트 내용(content)은 보내지 않아도 됩니다. 캡처 시 개인 내용이 보이면 가려 주세요.

---

## 보내는 형식 (예시)
```
0. Active: 배너 없음
1. notes 컬럼: id text(PK🔑), user_id uuid, folder text, color int4, type text, title text, content text, items jsonb,
   pinned bool, locked bool, sort_index int8, created_at int8, updated_at int8, deleted bool, remind_at: 없음, version: 없음, server_updated_at: 없음
   folders 컬럼: id text(PK), user_id uuid, name text, created_at int8
2. PK: notes.id / folders.id, user_id FK: (있음/없음)
3. Triggers: No triggers created yet / Functions: 없음
4. RLS: notes enabled, folders enabled / 정책: "own notes" ALL authenticated (auth.uid() = user_id) …
5. Realtime: supabase_realtime → notes ON, folders ON (또는 OFF / 표 없음)
6. notes: 137 rows, deleted=true 9, updated_at max 1789609869571 min 1720000000000, created_at …, user_id 1종
```
캡처 이미지로 보내셔도 됩니다. 결과를 받으면 제가 분석해서 방안 B SQL 실행이 안전한지 판단하고, 그때 다시 승인을 요청드리겠습니다. 그 전까지 코드·DB 모두 변경하지 않습니다.
