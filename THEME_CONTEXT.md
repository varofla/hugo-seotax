# varofla 테마 컨텍스트

최종 정리: 2026-09-22. 문서 정리 직전 기준 커밋은 `0b8d5ee`다. 이 문서는 현재 구현의 구조와 변경 시 보존해야 할 계약을 설명한다. 진행 중인 일은 [TODO.md](TODO.md)에서 관리한다.

## 1. 프로젝트 범위

- `seotax`를 기반으로 크게 수정한 **varofla 전용 Hugo 테마**다. 범용 테마 배포, example site, 다국어 UI, dark theme 지원은 목표가 아니다.
- 사이트 언어는 한국어 단일 언어다. upstream의 다국어·정렬·archive 기능이 현재 사양이라고 가정하지 않는다.
- 디자인 기준은 흰 본문, 옅은 차가운 탐색 표면, 청록색 강조, 선과 여백 중심의 구분, Pretendard 글꼴이다.
- 목록은 카드보다 구분선 중심의 행, 전체 카테고리는 2열 주제 디렉터리(모바일 1열), 태그는 빈도순 링크 목록이다.
- 글을 읽을 때 데스크톱 왼쪽 메뉴가 접히고 오른쪽 목차가 열린다. About도 메뉴가 접히지만 목차는 없다.

### 작업 위치와 안전 경계

| 구분 | 위치 |
| --- | --- |
| 테마 | `/mnt/tank/blog/varofla_blog_dev/themes/seotax_next` |
| 개발 사이트 | `/mnt/tank/blog/varofla_blog_dev` |
| 콘텐츠·설정 | `../../content`, `../../static`, `../../hugo.yaml` |
| Hugo 도구 | `../../tools/hugo.sh`, `../../tools/preview.sh` |
| 카테고리 생성기 | `../../scripts/gen-categories.py` |
| 운영 사이트 | `/mnt/tank/blog/varofla_blog` — 수정 금지 |

개발 빌드가 곧 배포를 뜻하지는 않지만 `deploy.sh`는 실행하지 않는다. 테스트 출력과 캐시는 `/tmp`에 둔다. 호스트에는 Hugo가 없으며 도구는 `hugomods/hugo:debian-non-root-0.158.0`을 사용한다. 테마에는 Node 기반 빌드나 테스트 러너가 없다.

## 2. 코드 지도

| 관심사 | 시작점 |
| --- | --- |
| 전체 골격·모바일 패널 | `layouts/baseof.html` |
| 자산·초기 전환·검색 데이터 | `layouts/_partials/head.html` |
| 홈·글 목록 | `layouts/index.html`, `_partials/posts/list.html`, `_partials/post-item.html` |
| 글 상세 | `layouts/posts/single.html` |
| 카테고리 | `layouts/categories/*`, `_partials/categories/*` |
| 태그 정규화 | `layouts/_partials/content/tags.html` |
| 검색 | `layouts/search/list.html`, `assets/js/search/{init,input,list}.js`, `assets/data/*.json` |
| About | `layouts/about/single.html`, `_partials/about/project-image.html`, `assets/js/about/projects.js` |
| 페이지 전환 | `assets/js/partials/post-card.js`, `site-menu.js`, `index-scroll.js`, `toc-highlight.js` |
| 이미지 확대 | `assets/js/shortcodes/image-zoom.js`, `assets/js/vendor/medium-zoom.js` |
| 스타일 진입점 | `assets/main.scss` |
| 공통 토큰 | `assets/css/variables/{_colors,_fonts,_defaults}.scss` |
| 목록·검색·읽기·About | `assets/css/{_lists,_search,_reading,_about}.scss` |

표의 `_partials` 경로는 `layouts/` 아래다. SCSS import 순서는 변수와 기본 스타일 → layout → lists → search → menu → shortcode → reading → about → custom이다. `_about.scss`가 `_reading.scss`의 전환 변수를 사용하므로 순서를 바꿀 때 주의한다. `_custom.scss`는 선택적 추가 스타일만 둔다.

## 3. 콘텐츠와 탐색 계약

### 글과 카테고리

- 글 section은 `posts`, permalink는 `/blog/:slugorcontentbasename/`다.
- `archetypes/posts.md`의 `layout: post`는 현재 정상 동작한다. 해당 이름의 템플릿이 없다는 이유만으로 바꾸지 않는다.
- `_partials/pages/posts.html`은 `hidden: true`를 제외하고 날짜 내림차순으로 반환한다. `_partials/pages/search.html`은 여기에 `searchExclude: true`도 제외한다.
- `categories: [상위, 하위]`는 독립 taxonomy 두 개가 아니라 **순서가 있는 2단계 경로**다.
- Hugo taxonomy는 tags만 등록하고 `disableKinds: [term]`을 사용한다. 카테고리 URL은 `gen-categories.py`가 section 페이지로 생성한다.
- `categories/catalog.html`과 `ordered-keys.html`이 사이드바·전체 디렉터리·하위 주제 링크의 데이터와 순서를 공유한다. 전체 디렉터리에서 사이드바의 펼침 DOM/JS를 재사용하지 않는다.
- 카테고리 수량은 하위 분류 수를 더하지 않은 실제 글 수다. 상위 카테고리의 `category-topics`는 사이드바가 접히는 폭에서만 보인다.

### 태그와 검색

- `content/tags.html`이 태그의 앞뒤 공백, 빈 값, 동일 글 안의 중복을 정리한다. 글 메타데이터, 전체 태그, 검색 데이터가 이 결과를 공유한다.
- 태그 링크는 개별 term 페이지가 아니라 `/search/?tags=...`로 이동한다.
- `head.html`은 `assets/data/{content,categories,tags}.json`을 렌더링·minify·fingerprint한다.
- content의 숫자 ID와 category/tag의 ID 목록은 같은 `pages/search` 순서에 의존한다. 한쪽의 필터나 정렬만 바꾸면 연결이 깨진다.
- 검색 결과 카드 HTML은 `layouts/search/list.html`의 숨은 `.search-data`에 들어간다. 별도 `post-items.json`을 데이터 원본으로 가정하지 않는다.
- URL 상태는 `query`, `category1`, `category2`, `tags`, `tagsOp`, `page`, `pageSize`다. 예전 `sort` 값은 무시하며 새 링크에 쓰지 않는다.
- 키워드가 있으면 Fuse 점수 오름차순 → 최신 날짜 → 숫자 ID 순, 키워드가 없으면 최신 날짜 → 숫자 ID 순이다. 정렬은 필터 뒤, 페이지네이션 전에 수행한다.
- 데스크톱과 모바일 모두 정렬 선택 UI가 없는 것이 현재 결정이다.

## 4. 읽기 화면과 페이지 전환

전환은 SPA가 아니라 실제 문서 이동 전후의 CSS/JS 애니메이션이다.

1. `post-card.js`가 대상 링크를 감지하고 `sessionStorage`의 진입 정보를 기록한다.
2. 새 문서의 `head.html`이 페인트 전에 `html.post-view-enter-pending`을 설정한다.
3. 글/About에서는 메뉴가 접히며, 목차가 있는 글은 오른쪽 목차가 열린다.
4. 복귀는 `post-view-exit-pending` 역전환 뒤 이동한다. `transitionend`와 fallback timer는 취소·완료 시 정리한다.
5. 뒤로/앞으로는 history entry의 `base`/`trap` 역할과 이전 페이지의 collapsed 여부를 사용한다.

연결된 계약:

- 글 데스크톱 스크롤 컨테이너는 `window`가 아니라 `.main-wrap`일 수 있다. `index-scroll.js`가 실행 시점 CSS로 실제 대상을 결정한다.
- `site-menu.js`는 메뉴 스크롤을 localStorage에, 글 스크롤을 pathname별 sessionStorage에 저장한다.
- `toc-highlight.js`는 활성 절과 목차 위치를 동기화하고, 실제 앵커 이동은 `index-scroll.js`가 담당한다.
- hash나 검색 URL을 바꿀 때 기존 `history.state`를 보존해야 한다.
- 진입 표시는 도착 페이지에서 한 번만 소비한다. reduced-motion, 모바일, 목차 없는 글처럼 애니메이션하지 않을 때도 오래된 값을 남기지 않는다.
- cross-document View Transition 시제품은 과도하다는 사용자 판단으로 되돌렸다. 현재 전환 위에 다시 도입하지 않는다.

## 5. 모바일 계약

- 56px sticky bar에 메뉴, 현재 페이지/활성 목차 항목, 검색 버튼을 둔다.
- 메뉴는 왼쪽 전체 높이 패널, 글 목차는 헤더 아래 상단 시트, 검색은 544px 이하에서 전체 화면이다.
- 메뉴·목차·검색은 `mobile:panel-open` 이벤트로 동시에 하나만 열며, 닫힌 패널에 `aria-hidden`과 `inert`를 적용한다. 데스크톱 resize 시 상태를 해제한다.
- 상단 목차는 짧으면 내용 높이, 길면 화면 약 90%에서 내부 스크롤한다. 별도 닫기 버튼 없이 현재 위치 버튼, 항목, 배경, Escape로 닫는다.
- 브라우저 기본 pinch 확대를 방해하지 않는다. 확대 이미지의 레이어는 모바일 목차와 헤더보다 위에 있어야 한다.
- 작은 화면 목록 썸네일은 제목 아래 16:9, 데스크톱은 오른쪽 4:3이다.

주요 breakpoint 계산값은 narrow 34rem(544px), body 49rem(784px), menu 77.4rem(1238.4px), toc 83.8rem(1340.8px), wide 92.6rem(1481.6px)이다. JS와 이미지 helper에 일부 px 상수가 따로 있으므로 숫자를 통합할 때 CSS·JS·`sizes`를 함께 검토한다. About 갤러리의 640px 경계는 목적이 다르다.

## 6. 이미지 계약

- 목록 카드는 `thumbnail`만 사용한다. 목차 이미지는 `cover` 우선, 없으면 `thumbnail`이다. SEO 이미지는 대체로 `thumbnail` 우선이라 서로 바꾸면 안 된다.
- `post-card-cover-img.html`은 crop/resize/srcset을 만들고, `img-size.html`은 표시 치수를 계산한다. 비슷해 보여도 역할 차이를 확인한 뒤 통합한다.
- Markdown 이미지는 `_markup/render-image.html`, image shortcode는 `_shortcodes/image.html`과 portable-image 경로를 사용한다.
- `image-zoom.js`는 Markdown/shortcode 이미지와 목차 cover의 확대, 휠 확대, drag, 키보드 이동, 이미지 교체를 함께 담당한다.
- `vendor/medium-zoom.js`에는 커스텀 `swap()`이 있다. 일반 upstream 파일로 덮어쓰지 않는다.
- 기존 콘텐츠는 image, bookmark, hint, columns, youtube, series shortcode를 실제 사용한다. 정적 참조가 없어 보인다는 이유만으로 shortcode를 제거하지 않는다.

## 7. About 현재 구현

About 콘텐츠는 테마 밖 `../../content/about/index.md`에 있고 `type: about`, `layout: single`을 사용한다.

| 필드 | 용도 |
| --- | --- |
| `tagline`, `bio` | 상단 소개 |
| `skills.main/occasional/experienced` | 선택적인 세 기술 그룹 |
| `projects[].name/desc/link/year/images` | 연도별 프로젝트 갤러리 |
| `params.author/menu.profileImage/social.github` | 이름·프로필·GitHub |

갤러리 기반 동작은 구현되어 있다.

- 첫 이미지는 왼쪽 대표 사진, 나머지는 오른쪽 과정 사진이다. 데스크톱 과정 영역만 세로 스크롤하며, 640px 이하에서는 소개 → 대표 사진 → 가로 썸네일 한 줄로 쌓인다.
- hover/focus 또는 모바일 tap으로 대표 미리보기를 교체한다. 저해상도 즉시 표시, 비동기 preview, 지연 spinner, crossfade는 `projects.js`가 담당한다.
- About에서는 공용 medium-zoom과 `image-zoom.js`를 로드하지 않는다. 이미지를 클릭해 확대하지 않는 것이 현재 동작이다.
- 문자열 이미지는 bundle 파일명 또는 기존 글 이미지 URL을 받는다. `{src, alt}` 객체로 명시적 대체 텍스트를 줄 수 있다.
- 로컬 URL은 원래 소유 글의 page resource를 찾아 기존 게시 경로를 유지한다. About 전용 이미지는 `content/about/` bundle에 둔다. 누락된 상대 파일은 빌드 오류다.
- 프로젝트 상태 배지는 사용하지 않는다. 연도와 프로젝트 순서는 front matter의 첫 등장 순서다.

About은 **완료된 화면으로 간주하지 않는다.** 갤러리를 다시 만드는 것이 아니라 소개 문구, Skills, 섹션 표현, 프로젝트 콘텐츠와 접근성 정보를 사용자와 마무리하는 단계가 남았다. 구체적인 체크리스트는 `TODO.md`를 따른다.

## 8. 현재 디자인 결정

- 사이드바 위쪽에는 카테고리·태그·검색 아이콘과 About을 둔다. 모바일 검색은 헤더 아이콘만 쓴다. GitHub와 RSS는 About에만 둔다.
- 전체 글·카테고리·태그·검색의 제목과 수량 표기는 한국어로 통일한다.
- 목록/분류/검색 wrapper는 `.markdown`을 사용하지 않는다. 본문용 Markdown 스타일을 UI에 다시 상속시키지 않는다.
- 포스팅의 읽기 배치, 목차, 진행선, series, 이전/다음과 About 갤러리의 서로 다른 밀도는 유지한다. 모든 화면을 같은 카드 형태로 만들지 않는다.
- 404와 `/posts/`도 공통 골격과 글 목록을 사용한다.
- 공사 안내, service worker/offline, 사용 중인 shortcode 같은 기능 제거는 별도 사용자 결정이다.

## 9. 검증 방법

기본은 실제 글 bundle 1~몇 개, 홈, 검색, 필요한 카테고리와 About만 복사한 `/tmp` 축소 사이트다. `preview.sh --file`은 About을 자동 포함하지 않고 실행 중 원본 테마 변경도 자동 동기화하지 않으므로 재시작 또는 임시 테마 갱신이 필요하다. `hugo.sh`의 컨테이너 `/tmp`는 호스트 `/tmp`와 다르므로 결과 경로 mount도 확인한다.

변경 범위에 맞춰 다음을 고른다.

1. 홈/카테고리/검색 → 글/About → 복귀, 브라우저 뒤로/앞으로와 전환 도중 방향 반전.
2. 글 직접 방문, hash 방문, 새로고침 스크롤 복원, 데스크톱↔모바일 resize.
3. cover/thumbnail 조합, Markdown·shortcode·columns 이미지, 확대·교체·Escape.
4. 검색어, 2단계 카테고리, 태그 AND/OR, pagination URL, 빈 결과와 ID 연결.
5. 모바일 메뉴·목차·검색 상호 배타, body lock, `aria-hidden`/`inert`, 긴 제목·표·코드의 가로 넘침.
6. About 갤러리의 hover/focus/tap, 느린 preview, 투명 이미지, 긴 설명, 이미지가 적거나 많은 프로젝트.

대표 폭은 360/390px, 768px, menu 경계 전후(약 1238px), 1440px다. JavaScript 구문 검사와 Hugo의 경고·오류뿐 아니라 브라우저 런타임 예외도 확인한다. 외부 댓글, Analytics, 운영 URL 이미지 때문에 생긴 오류는 테마 자체 오류와 구분한다.

## 10. 후속 작업

활성 작업, 사용자 결정 대기, 장기 기술 부채는 [TODO.md](TODO.md)에서만 관리한다. 정리 목적만으로 기능을 제거하지 말고, 현재 출력·실제 콘텐츠 사용·축소 빌드·브라우저 동작을 확인한 뒤 처리한다.
