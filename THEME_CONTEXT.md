# varofla 테마 작업 컨텍스트

최초 분석 기준: 2026-09-20, 테마 HEAD `6ca296e`. 현재 로컬 코드와 사이트 설정을 기준으로 작성했고, 같은 날 수행한 찌꺼기 청소 결과를 후속 반영했다. 아래 표에서 완료한 정리와 남은 후보를 구분한다.

## 0. 최신 변경 — 2026-09-21 디자인 통합

사용자가 디자인 선택을 위임하고 개발 사본의 빌드를 승인했다. 이번에 채택한 기준과 검증 결과는 [DESIGN_CHANGES.md](DESIGN_CHANGES.md)에 있다. 아래 초기 기록과 충돌하면 이 절과 변경 문서를 우선한다.

- 목록은 흰 배경의 구분선 중심 행, categories는 본문 전용 2열 주제 디렉터리(모바일 1열), tags는 빈도순 링크 목록이다. 탐색 제목·수량 표기는 한국어로 통일했고, 카테고리별 수량은 실제 글 수다. 상위 카테고리의 `category-topics`는 사이드바가 접히는 화면에서만 표시한다.
- `content/tags` partial이 빈 태그·공백·동일 태그 중복을 정리한다. 글 메타데이터, 태그 전체 보기, 검색 데이터가 이를 공유한다. 검색의 숫자 ID 순서는 그대로 유지했다.
- `categories/catalog` partial은 사이드바·디렉터리·하위 주제 링크의 데이터와 순서를 공유한다. 디렉터리는 사이드바의 DOM/펼침 JS를 재사용하지 않는다.
- 목록 상단과 사이드바에 중복되던 `browse-nav`/`site-menu-browse`는 제거했다. 데스크톱 사이드바의 상단 링크는 카테고리·태그·검색 아이콘과 About이며, 모바일 검색은 헤더 아이콘만 쓴다. GitHub·RSS는 About에만 둔다.
- Pretendard 1.3.9 variable font를 `static/fonts`에 라이선스와 함께 포함했다. Google Fonts 요청은 제거했다. 색상과 글꼴의 공통 토큰은 `variables/_colors.scss`, 로드는 `variables/_fonts.scss`에 있다.
- `_lists.scss`: 페이지 헤더, 글 목록, 분류 디렉터리, 페이지 번호, 빈 상태. `_search.scss`: 검색 모달과 필터. `_reading.scss`: 읽기 레이아웃·전환·목차·공유 헤더. `_about.scss`: About. `_custom.scss`는 선택적 추가 스타일만 담는다.
- About 복귀 스크립트는 버튼 뒤로 옮겼다. About 갤러리, 이미지 확대, 읽기 전환과 모바일 패널 구조는 유지했다. `/posts/`도 홈과 공통 목록 partial을 사용하며, 404는 공통 레이아웃을 사용한다.
- 운영 디렉터리와 배포 스크립트는 변경하지 않았다. 전체 개발 사이트 빌드 산출물은 `/tmp/varofla-redesign/public`, 검증 자료는 `/tmp/varofla-redesign`에 있다.

## 1. 사용자와 합의된 방향

- **varofla 전용 테마로 관리한다.** 범용 Hugo 테마 호환성을 유지하는 것이 목표가 아니다. 이번 대화에서 사용자가 명시했다.
- **한국어 단일 언어 사이트로 관리한다.** i18n 번역이나 다국어 데모는 제공하지 않는다.
- 작업 순서는 찌꺼기 청소 → 모바일 디자인 → About 확장이다. 이번 요청의 산출물은 후속 작업을 위한 컨텍스트 문서다.
- 글 읽기에 집중: 글을 읽는 동안 불필요한 카테고리 사이드바를 접는다.
- 부드러운 전환: 이미지 확대, 글 진입 시 왼쪽 메뉴 접힘과 오른쪽 목차 열림, 복귀 시 반대 전환을 보존한다.
- 간결한 UI: 기능 설명이나 조작 버튼을 무작정 늘리지 않는다. 이미지 휠 확대·키보드 이동처럼 자연스럽게 조작할 수 있는 방식을 선호한다.
- 모바일은 얇은 현재 위치 바를 고정하고, 사이트 메뉴는 왼쪽 패널, 글 목차는 헤더 아래에서 내려오는 상단 시트로 연다. 검색은 작은 화면에서 전체 화면을 사용하며 세 탐색 UI는 동시에 하나만 열린다. 글 목차의 활성 절을 상단 바에 표시하고, 확대 이미지에는 두 손가락 pinch를 지원한다.
- About에 대표 프로젝트를 소개하는 “Best of My Work” 성격의 섹션을 원한다. 자세한 요청은 About 작업 시 받는다.
- 기능 제거, 디자인 선택 등 사용자 판단이 필요한 사항은 질문한다. 전용 테마라는 결정만으로 현재 기능 제거까지 승인된 것으로 해석하지 않는다.

## 2. 작업 경계와 실행 환경

| 범위 | 위치 / 역할 |
| --- | --- |
| 작업 테마 | `/mnt/tank/blog/varofla_blog_dev/themes/seotax_next` |
| 개발 사이트 | `/mnt/tank/blog/varofla_blog_dev` — 테마 기준 `../..` |
| 운영 사이트 | `/mnt/tank/blog/varofla_blog` — 사용자 설명상 개발 사이트의 원본, 별도 디렉터리 |
| 설정·콘텐츠 | `../../hugo.yaml`, `../../content/`, `../../static/` |
| 실행 도구 | `../../tools/hugo.sh`, `../../tools/preview.sh` |
| 카테고리 생성 | `../../scripts/gen-categories.py` |
| Git 원격 | `https://github.com/varofla/hugo-seotax` |

같은 프로덕션 서버 위에 있지만 개발 디렉터리에서 빌드한다고 운영 배포가 되지는 않는다. 그래도 **`deploy.sh`는 실행 금지**, 테스트 출력은 **`/tmp`**, 기본 검증은 축소 빌드를 쓴다. 전체 글 빌드는 사용자가 명시적으로 허용한 경우에만 실행한다. 운영 디렉터리를 수정하지 않는다.

현재 호스트에서 Docker는 사용 가능하고 `hugo` 실행 파일은 PATH에 없다. 도구 스크립트는 `hugomods/hugo:debian-non-root-0.158.0`을 사용하며 실제 축소 빌드에서 Hugo **0.158.0 extended**를 확인했다. 테마는 Hugo 템플릿 + SCSS + 일반 JavaScript로 구성되며 `package.json` 기반 빌드나 테스트 러너는 없다.

분석 시 개발 사이트에 별도 `layouts/`, `assets/`, `data/` 오버라이드는 없었다. 동작의 상당 부분은 테마 안에 있지만 콘텐츠·설정·카테고리 생성기는 테마 저장소 밖에 있다. 포스트 Markdown은 104개였다.

`AGENTS.md`는 `.gitignore`에 의해 제외된다. 따라서 이 문서를 추적 가능한 본문으로 두고, 로컬 `AGENTS.md`에서 연결한다.

## 3. 주요 파일 지도

| 관심사 | 시작할 파일 | 연결되는 부분 |
| --- | --- | --- |
| 전체 골격 | `layouts/baseof.html` | 왼쪽 메뉴, 모바일 헤더, 본문·푸터, 오른쪽 목차, 숨김 checkbox |
| 자산·초기 상태 | `layouts/_partials/head.html` | SCSS 컴파일, JS 로드, 전환 초기화, 검색 데이터, SEO, SW, Analytics |
| 홈·글 목록 | `layouts/index.html`, `layouts/_partials/post-item.html` | 10개씩 페이지네이션, 카드 클릭, 썸네일 |
| 글 상세 | `layouts/posts/single.html` | 글 헤더·복귀 링크만 재정의, 나머지는 base 템플릿 |
| 일반 페이지 | `layouts/single.html`, `layouts/list.html` | dummy define으로 base 템플릿 동작 사용 |
| 카테고리 | `layouts/categories/list.html`, `_partials/categories/*` | 생성된 section 페이지 + front matter 기반 2단계 분류 |
| 검색 | `layouts/search/list.html`, `assets/js/search/{init,input,list}.js` | Fuse, 검색 모달, 필터·결과·페이지네이션 |
| About | `layouts/about/single.html`, `assets/js/about/projects.js` | `../../content/about/index.md`의 front matter와 프로젝트 미리보기 |
| 기본 레이아웃·반응형 | `assets/css/_layouts.scss`, `variables/_defaults.scss` | 메뉴·목차·overlay·breakpoint |
| 메뉴 외관 | `assets/css/_menu.scss`, `layouts/_partials/menu/*` | 프로필, 링크, 공지, 카테고리, 최근 글 |
| 목록·검색 외관 | `assets/css/_lists.scss`, `_search.scss` | 탐색 목록/분류와 검색 컨트롤을 분리 |
| 글·About 외관 | `assets/css/_reading.scss`, `_about.scss` | 읽기 레이아웃·전환·헤더와 About을 분리 |
| 본문 표현 | `assets/css/main/_markdown.scss`, `_shortcodes.scss` | Markdown, 코드, 이미지, columns 등 |
| 이미지 처리 | `_partials/content/{cover-url,cover-image,post-card-cover-img,toc-cover,img-size,img-attr}.html` | 카드·목차·본문별 서로 다른 경로 |
| 이미지 인터랙션 | `assets/js/shortcodes/image-zoom.js`, `assets/js/vendor/medium-zoom.js` | 확대, 교체, 휠·드래그, 로딩 상태 |

표에서 `_partials/`로 시작하는 경로는 `layouts/` 아래다. SCSS의 `variables/`는 `assets/css/` 아래다.

`assets/main.scss`의 적용 순서는 변수 → light theme/highlight → normalize/icon/utils/print/markdown → layouts → lists → search → menu → shortcodes → reading → about → custom이다. 목록·분류·검색은 `.markdown` wrapper를 사용하지 않는다. `_reading.scss`의 전환 변수는 `_about.scss`에서도 참조하므로 import 순서를 유지한다.

## 4. 페이지·콘텐츠·검색 계약

### 글과 분류

- `params.posts.section: posts`, permalink는 `/blog/:slugorcontentbasename/`이다.
- `archetypes/posts.md`: `title`, `date`, `layout: post`, `description`, `cover`, `thumbnail`, `categories`, `tags`. `layouts/posts/post.html`은 없지만 현재 빌드에서 `posts/single.html`로 글 헤더가 생성된다. 이름만 보고 layout 값을 변경하지 않는다.
- `_partials/pages/posts.html`은 해당 section의 RegularPages에서 `hidden: true`를 제외하고 날짜 내림차순으로 반환한다.
- `_partials/pages/search.html`은 그 결과에서 `searchExclude: true`를 추가로 제외한다.
- `categories: [상위, 하위]`는 두 개의 독립 태그가 아니라 **순서가 있는 2단계 경로**다. 메뉴 순서는 사이트 설정의 `params.categoryOrder`도 참조한다.
- 사이트의 Hugo taxonomy는 `tags`만 등록되어 있고 `disableKinds: [term]`이다. 카테고리 URL은 Python 스크립트가 `content/categories/.../_index.md`를 생성하여 만든 section 페이지다.
- 생성기는 정규식으로 YAML 일부 형식을 읽고, 더 이상 해당되지 않는 카테고리 `_index.md`를 삭제한다. 테마 내부 분류 처리와 파서 지원 범위가 같다고 가정하지 않는다.
- 카테고리 목록의 수량은 실제 글 수다. 2026-09-21 디자인 선택 위임에 따라 기존의 글 수 + 하위 카테고리 수 집계를 수정했다.

### 검색

- `head.html`이 `assets/data/{content,categories,tags}.json`을 Hugo resource template으로 렌더링·minify·fingerprint하고 URL을 `window.siteSearch`에 전달한다.
- content의 숫자 ID와 category/tag의 ID 집합은 같은 `pages/search` 순서에 의존한다. 필터나 정렬을 한쪽만 바꾸면 연결이 깨질 수 있다.
- 검색 결과 카드 원본은 `layouts/search/list.html`의 숨겨진 `.search-data` 안에 HTML로 전부 들어간다. `post-items.json`이 현재 검색의 실제 데이터 공급원이라고 가정하지 않는다.
- URL 상태는 `query`, `category1`, `category2`, `tags`, `tagsOp`, `page`, `pageSize`. 태그 링크는 `/search/?tags=...`로 간다.
- Fuse 본문·제목 검색과 카테고리·태그 필터는 사이트의 주요 탐색 기능이다. 모바일 디자인 범위에도 검색 모달과 결과 카드가 포함된다.

### 기존 글 호환성

실제 104개 Markdown을 단순 패턴 검색했을 때 shortcode 사용은 `image` 1,751회, `bookmark` 120회, `hint` 117회, `columns` 100회, Hugo 내장 `youtube` 31회, `series` 7회였다. 코드 예시 속 표기를 포함할 수 있는 정적 집계지만 제거 위험을 판단하는 근거다. 특히 이미지·columns 경로를 청소할 때 기존 글을 반드시 확인한다. 집계에서 나오지 않은 shortcode도 즉시 삭제 대상으로 확정하지 않는다.

## 5. 읽기 화면과 전환: 함께 다뤄야 할 묶음

### 데스크톱

일반 목록은 왼쪽 메뉴와 본문을 보여준다. `body.site-kind-page.site-type-posts`에서는 메뉴 DOM을 유지하면서 너비·불투명도를 줄이고, 본문 스크롤을 `window`에서 **`.main-wrap`**으로 옮긴다. 오른쪽 목차는 존재할 경우 240px 패널로 표시된다. About도 메뉴가 접히지만 목차는 템플릿에서 비워 둔다.

전환은 SPA가 아니라 실제 문서 이동을 감싸는 방식이다.

1. `post-card.js`가 카드·대상 링크 클릭을 감지하고 sessionStorage의 `postView.enterTransition`에 목적지와 전환 원인을 기록한다.
2. 다음 페이지의 `head.html`이 CSS 표시 전에 이를 읽어 `html.post-view-enter-pending`을 설정한다.
3. `_custom.scss`가 메뉴 접힘·목차 열림을 실행한다. 기본 전환 시간은 460ms이다.
4. 복귀 시 `post-view-exit-pending`으로 역방향 전환 후 실제 이동한다. JS에는 500ms fallback과 600ms 진입 정리 타이머가 있다.
5. 브라우저 뒤로가기는 `history.replaceState/pushState`로 추가 상태를 만들고 `popstate`를 처리한다. 상태 키는 `__postViewHistoryBase`, `__postViewHistoryTrap`, `__postViewPreviousIsPost`다.

연결된 다른 파일:

- `site-menu.js`: 메뉴 스크롤을 localStorage `siteMenu.scrollTop`에 저장. 글 본문 스크롤은 sessionStorage `postView.mainWrapScrollTop:<pathname>`에 저장하고 새로고침 시 복구한다.
- `toc-show.html`: 제목 또는 글 cover/thumbnail 등을 바탕으로 목차 존재 여부를 결정한다. 전환 JS는 글 목차 유무도 확인한다.
- `toc-highlight.js`: 활성 제목·목차 위치 동기화, `.main-wrap`에서의 목차 이동.
- `index-scroll.js`: window 기반 앵커 이동, 초기 hash 처리, 제목 강조.
- `scroll-progress.js`: 초기 스타일을 보고 스크롤 대상을 선택한다.

특히 `index-scroll.js`는 `history.replaceState(null, '', hash)`를 호출한다. 전환의 history 상태와 겹치는 지점이며, `toc-highlight.js`와 같은 목차 클릭에 별도 핸들러도 등록한다. 동작을 재현하면서 통합해야 한다.

### 모바일 현재 상태

- 2026-09-20 모바일 레이아웃을 구현했다. 헤더는 56px 높이의 sticky 현재 위치 바로, 왼쪽 메뉴 버튼·현재 글/절·검색 버튼을 표시한다(`header/mobile.html`). 글을 스크롤하면 `toc-highlight.js`가 활성 목차 항목을 가운데 문구에 반영한다.
- 왼쪽 메뉴는 최대 18rem의 전체 높이 패널이다. 목차는 헤더 바로 아래에서 내려오는 전체 너비 상단 시트이며, 짧으면 내용 높이까지만 열리고 길면 화면 90% 지점에서 멈춰 내부 스크롤한다. 아래 두 모서리는 1.75rem으로 둥글게 처리했다. 별도의 제목과 닫기 버튼 없이 cover와 목차 항목만 표시하며, 헤더의 현재 위치 버튼을 다시 누르거나 목차 항목·배경을 선택하거나 Escape를 누르면 닫힌다. 읽던 window scroll 위치는 유지한다.
- 메뉴·목차·검색은 `mobile:panel-open` 이벤트로 상호 배타적으로 열린다. 닫힌 패널에는 `aria-hidden`과 `inert`를 적용하고, 데스크톱 resize 시 이를 해제한다. 패널이 열리면 body scroll을 잠근다.
- 검색은 544px 이하에서 동적 viewport 전체를 쓰며, iOS 입력 확대 방지를 위한 16px 입력 크기와 safe-area padding을 적용한다.
- 목록 카드의 모바일 썸네일은 제목 다음에 나오며 16:9로 표시한다. 작은 화면의 본문 글꼴·글 헤더·태그·코드·표를 조정했다. `columns` 이미지는 별도 가로 스크롤 없이 기존처럼 한 화면 안에서 축소 배치한다.
- 모바일 pinch는 이미지 전용 Pointer Events로 가로채지 않고 브라우저의 기본 페이지 확대를 사용한다. 데스크톱의 휠 확대·확대 뒤 드래그·키보드 이동은 유지한다.
- 모바일 목차 cover를 확대할 때 목차 시트가 확대 화면 위에 남지 않도록 레이어를 분리했다. 목차/헤더는 1001/1002, medium-zoom 배경·이미지·로더는 1100/1101/1102이며, 확대를 닫으면 기존에 열려 있던 목차로 돌아온다.

### breakpoint 주의

`variables/_defaults.scss`의 실제 계산값은 아래와 같다(기본 16px 환산). 파일의 일부 px 주석은 현재 식과 맞지 않는다.

| 이름 | 값 | 16px 환산 |
| --- | --- | --- |
| narrow | 34rem | 544px |
| body | 49rem | 784px |
| menu | 77.4rem | 1238.4px |
| toc | 83.8rem | 1340.8px |
| wide | 92.6rem | 1481.6px |

CSS는 `--menu-breakpoint`를 노출하고 일부 JS가 이를 읽지만, `head.html`/`post-card.js`에는 `77.4rem + 0.02px`가 별도로 들어 있다. `toc-cover.html`에는 `1254px`와 `1080px`가 있다. CSS의 min/max 조건이 같은 경계에 걸리는 부분도 있다. 수치를 통일할 때 레이아웃·JS·이미지 sizes/source를 함께 검토한다.

## 6. 이미지와 본문 렌더링

- **목록 카드**는 `thumbnail`만 사용한다. 최근 커밋 `9c911f4`가 썸네일을 복원한 상태다. `cover`로 일괄 대체하지 않는다.
- **목차 이미지**는 `cover` 우선, 없으면 `thumbnail`이다. `cover-url` → `toc-cover` → `cover-image` → `post-card-cover-img` 경로다.
- **SEO 이미지**는 대체로 `thumbnail` 우선, 없으면 `cover`이므로 목차와 우선순위가 다르다.
- `post-card-cover-img`와 `img-size`는 page bundle 파일명 → 같은 basename의 다른 확장자 → assets의 rootPath 경로 순으로 찾는 로직을 중복 보유한다.
- 카드용 helper는 crop/resize 및 srcset을 생성한다. 목차는 `PreserveRatio`를 전달한다. `img-size`는 width/height 표시값을 계산하며 원본 파일을 리사이즈하는 함수는 아니다.
- Markdown 이미지는 `_markup/render-image.html`을 거친다. 확장자에 따라 image/video/link로 나누며 이미지는 `.md-image` span으로 감싼다. 기존 overlay용 label/checkbox는 2026-09-20 청소에서 제거했다.
- `image` shortcode는 page resource를 직접 찾고 필요하면 resize하며 원본 확대용 `data-zoom-src`를 만든다. `portable-image`는 bundle/assets URL 해석을 맡는다.
- 사이트의 `params.image.rootPath`는 `themes/seotax/assets/_images`로 되어 있으나 실제 테마 이름은 `seotax_next`다. page resource가 먼저 잡히는 경로도 있으므로 이 설정만으로 전체 이미지가 깨졌다고 판단하지 않는다.
- `image-zoom.js`는 본문의 `.md-image`, `.sc-image`와 목차 cover를 대상으로 한다. 확대 로딩 상태, 휠 확대, 확대 상태 드래그, 좌우 화살표 이동, 이미지 비율에 맞춘 columns 분배까지 담당한다.
- `vendor/medium-zoom.js`에 커스텀 `swap()` 구현이 있다. 일반 upstream 패키지로 덮어쓰면 이미지 전환이 달라질 수 있다.
- 커스텀 코드에서 모바일 pinch/swipe를 완성된 기능으로 확인하지 않았다. vendor에 touch 처리는 있지만 실제 제스처 동작은 기기에서 검증해야 한다.

코드 블록은 Hugo `transform.HighlightCodeBlock`으로 만든 뒤 `head.html`에서 highlight.js와 line-number 플러그인을 초기화한다. 복사 버튼은 `copy-code.js`의 전역 `copyCode()`를 호출한다. KaTeX·Mermaid는 shortcode와 render hook도 별도로 있으므로 단순 텍스트·이미지 글만으로 전체 본문 기능을 검증할 수 없다.

## 7. About 현재 상태

콘텐츠는 테마 밖 `../../content/about/index.md`에 있다. `type: about`, `layout: single`이며 아래 필드를 사용한다.

| 필드 | 현재 용도 |
| --- | --- |
| `tagline`, `bio` | 소개 문구; bio는 safeHTML 출력 |
| `skills.main/occasional/experienced` | 세 그룹의 기술 태그 |
| `projects[]`의 `name`, `desc`, `link`, `year`, `images` | 연도별 프로젝트 갤러리; link와 images는 선택 |
| 사이트 `params.author/menu.profileImage/social.github` | 이름·프로필·GitHub 링크 |

정상적으로 종료한 프로젝트만 올리므로 상태 필드와 배지는 사용하지 않는다. 연도 순서는 입력에서 처음 등장하는 순서를 따른다. 현재 콘텐츠에는 스마트 굴비, Rack Out Of Dust, LEXON MOD가 등록되어 있고 Skills는 주석 처리되어 있다.

### 2026-09-20 프로젝트 갤러리

- 사용자 결정: Yufeng Wu 스타일을 따르지 않는다. 대표 사진은 왼쪽, 오른쪽에는 이름·설명과 과정 사진을 위에서 아래로 둔다. 과정 사진이 오른쪽 열을 넘으면 그 영역만 세로 스크롤한다. 연도 라벨은 유지한다.
- `images` 첫 항목이 대표 사진이며 이후 순서는 입력 순서를 그대로 따른다. 모든 사진 칸은 4:3이고 다른 비율의 원본은 `object-fit: cover`로 가운데를 잘라 표시한다. 데스크톱 과정 사진은 오른쪽 3열 세로 스크롤 영역에 놓는다. 640px 이하에서는 이름·설명 → 폭 전체 대표 사진 → 대표 사진을 제외한 가로 썸네일 한 줄 순으로 쌓는다. 세 영역과 썸네일 사이 간격은 6px로 통일하고, 마지막 사진 일부가 잘려 보이게 해 가로 이동을 암시한다.
- 과정 사진에 마우스를 올리거나 키보드 focus를 두면 타일에 이미 로드된 저해상도 이미지를 대표 사진 자리에 먼저 표시하고, 800px 이하의 미리보기를 비동기로 불러온다. 200ms 이상 걸리면 포스팅 확대 화면과 같은 스피너를 표시하고, 로드가 끝나면 240ms 크로스페이드로 교체한다. 사진 사이 전환에서는 이전 미리보기를 불투명하게 유지한 채 새 레이어를 그 위로 페이드 인하고, 완료 후 이전 레이어를 숨겨 맨 아래 대표 사진이 비치지 않게 한다. 미리보기 레이어는 흰 배경을 포함해 투명 WebP의 여백으로 아래 대표 사진이 비치지 않는다. 과정 사진 사이의 여백에서는 마지막 미리보기를 유지하고, 과정 사진 영역 전체를 벗어나면 원래 대표 사진으로 부드럽게 돌아온다. 포인터 종류가 mouse일 때만 hover를 처리하며 모바일에서는 탭으로 같은 저해상도→미리보기 전환을 실행한다.
- 미리보기 상태·선로딩·크로스페이드 이벤트는 `assets/js/about/projects.js`가 담당하고 `head.html`에서 About 페이지에만 조건부 로드한다. About에서는 공용 `medium-zoom`과 `image-zoom.js`를 로드하지 않는다.
- 데스크톱의 이미지 프로젝트는 대표 사진과 같은 높이의 오른쪽 열 안에 정보를 상단 고정하고 과정 사진을 그 아래 3열로 둔다. 정보 높이가 늘면 과정 사진 영역만 줄며, 과정 사진이 대표 사진 하단을 넘을 분량이면 해당 영역만 세로 스크롤한다. 사진과 세로 스크롤바 사이에는 6px 여백을 둔다. 사진이 적어 스크롤이 없으면 마지막 과정 사진 줄을 대표 사진 하단에 맞춘다. 스크롤 경계에서 일부만 보이는 사진에는 JS가 현재 잘린 면을 계산한 `clip-path`를 적용해 컨테이너 양쪽과 위아래 모서리를 8px로 유지한다. 과정 사진 버튼은 클릭을 암시하는 pointer 커서를 쓰지 않는다. 모바일 썸네일은 한 줄 가로 스크롤이고 탭한 사진을 대표 영역에 유지한다. 페이지 안에서 과정 썸네일 이외의 영역을 탭하면 원래 대표 사진으로 돌아간다.
- 프로젝트 바깥 세로 간격은 데스크톱에서 연도 구분선→프로젝트 12px, 프로젝트→다음 연도 또는 같은 연도의 다음 프로젝트 24px이다. 640px 이하에서는 연도 구분선→프로젝트 16px, 프로젝트→다음 연도 또는 같은 연도의 다음 프로젝트 32px를 사용한다. 마지막 연도 그룹에는 불필요한 하단 여백을 남기지 않는다.
- 프로젝트 이름에 링크가 있으면 이름에만 글 제목과 같은 hover/focus 반응을 적용하고 해당 프로젝트 글로 이동한다. About의 이미지는 클릭해도 확대되지 않는다. 과정 사진은 키보드 focus로도 대표 사진 미리보기를 바꿀 수 있다.
- `_partials/about/project-image.html`은 기존 포스팅 URL 또는 About bundle 파일명을 받는다. 선택적으로 `{src, alt}` 객체도 지원한다. front matter의 값에는 Markdown render hook이 자동 적용되지 않으므로 `![](...)` 문법을 쓰지 않는다.
- `https://varofla.com/blog/.../image.webp` 또는 `/blog/.../image.webp`는 해당 URL의 소유 페이지에서 resource를 찾아 원래 경로로 게시한다. `/about/`에 원본을 복사하지 않는다. 축소 빌드에 소유 글이 없거나 외부 URL이면 입력 URL을 그대로 사용한다. About 전용 파일은 `content/about/`에 둔다. 누락된 상대 파일명은 빌드 오류로 알린다.
- 원본 경로를 `src`에 유지하고 Hugo Resize로 만든 작은 버전을 `srcset`에 넣는다. 기존 글도 사용하는 동일 원본 URL이 유지된다. 제목/번호 기본 alt보다 사진의 내용을 설명하는 명시적 alt가 권장된다.

```yaml
projects:
  - name: 스마트 굴비
    desc: nRF54L15 기반 Matter 스마트 조명 디바이스
    year: 2026
    images:
      - https://varofla.com/blog/smart-gulbi-3/260625_203845.webp
      - 260920_152604.webp
      - src: 260920_153135.webp
        alt: 스마트폰으로 제어하는 스마트 굴비 조명
```

- 개발 About 콘텐츠에는 스마트 굴비 16장, Rack Out Of Dust 10장, LEXON MOD 7장이 등록되어 있다. 테마 밖의 콘텐츠와 About 전용 이미지도 사이트 저장소에서 함께 관리한다.
- 검증: 전체 개발 사이트 Hugo 빌드와 Chrome 151에서 데스크톱 3열·세로 스크롤, 사진이 적을 때 하단 정렬, 240ms 크로스페이드, 갤러리 경계의 둥근 클리핑, 투명 WebP 미리보기의 흰 배경을 확인했다. 390px에서는 정보 → 4:3 대표 사진 → 가로 썸네일 순서, 일부만 보이는 마지막 사진, 탭 선택 유지와 썸네일 밖 탭 복귀, 문서 폭 넘침 없음을 확인했다. About에는 확대 스크립트가 없고 일반 포스팅의 이미지 확대·화살표 이동·Escape는 그대로 동작한다. 실기기 터치 검증은 별도다.

**2026-09-21 수정:** About 복귀 링크 초기화 inline script를 `content-header` 뒤로 옮겼다. 같은 사이트의 참조 페이지로 돌아가는 링크가 정상 초기화된다.

초기 참고 사이트는 [Yufeng Wu의 포트폴리오](https://www.yufengwu.com/)였지만, 이후 사용자가 해당 스타일을 따르지 않고 별도 디자인으로 진행하기로 결정했다.

## 8. 정리 현황과 판단 근거

검증을 마친 항목과 아직 판단이 필요한 항목을 나눈다. **미참조 추정과 동작 결함을 구분하고, 삭제 전에 사이트 콘텐츠와 출력물을 확인한다.**

### 2026-09-20 완료

| 항목 | 처리 |
| --- | --- |
| 카테고리 클라이언트 렌더링 | 미로딩 `assets/js/category/list.js`, 전용 `assets/data/post-items.json`, `search/init.js` 내 `initPostItems()`와 단독 유틸 `capitalize()`를 제거했다. Hugo 카테고리 템플릿은 유지했다. |
| 코드 복사 잔재 | unused `assets/js/shortcodes/clipboard.js`를 제거했다. 실제 버튼 기능인 `copy-code.js`는 유지했다. |
| 이미지 overlay 잔재 | 빈 `.image-overlay` DOM/CSS/z-index, Markdown checkbox, 해당 규칙에서만 쓰이던 방향 판별 JS를 제거했다. medium-zoom과 `.md-image`/`.sc-image` 로딩 처리는 유지했다. |
| 사용되지 않는 설정 | 개발 설정의 `params.i18nDir`, `params.image.rotateLandscapeImages`를 제거했다. |
| 범용 테마 배포 잔재 | `exampleSite/`, 이를 배포하던 `.github/workflows/deploy.yml`, 미사용 Hugo Modules용 `go.mod`를 제거했다. `theme.toml`은 varofla 전용 메타데이터로 바꾸고 `head.html`의 `.Translations` 링크 생성을 제거했다. 단일 사이트에도 필요한 `languageCode`, HTML `lang`/`dir`, JSON-LD `inLanguage`는 유지했다. |

### 남은 정리 후보

| 후보 | 확인 근거 | 후속 처리 시 주의 |
| --- | --- | --- |
| 이미지 리소스 탐색 중복 | `img-size`와 `post-card-cover-img`에 유사한 탐색 | crop, 종횡비, 원본 확대 URL의 차이는 유지 |
| 전환·앵커·스크롤 상태 분산 | head + post-card + site-menu + index-scroll + toc-highlight | 뒤로/앞으로, 새로고침, hash, resize 회귀가 핵심 |
| breakpoint·시간 상수 중복 | rem/px 및 CSS/JS에 분산 | 현재 시각 기준을 먼저 확보 |
| highlight 중복 처리 | Hugo 강조 후 브라우저에서도 강조; `console.warn` 전역 패치 존재 | 언어 확장·라인 번호·복사 결과를 확인하고 정리 |
| 공지 문구 하드코딩 | `layouts/_partials/menu/nav.html`에 현재 공사 안내 포함 | 문구 삭제·설정화 여부는 사용자 결정 |
| 오래된 설정 | image rootPath가 현재 테마 이름과 다르지만 렌더링 helper가 참조함 | page resource 우선 경로와 실제 이미지 탐색을 더 확인한 후 수정 |

원본 [hugo-seotax 저장소](https://github.com/minyeamer/hugo-seotax)의 현재 기능 설명은 이 fork의 사양이 아니다. 이번에는 upstream과의 전체 diff나 최신 버전 동기화를 수행하지 않았다. 원본의 기능이 여기에도 있다고 추정하지 않는다.

### 캐시·외부 자산

사이트 설정은 `serviceWorker: precache`다. `assets/sw.js`는 페이지와 기록된 자산을 precache하고, fetch는 network 우선·실패 시 cache를 사용한다. `sw-register.js`는 controller 교체 시 reload한다. `head.html`에는 별도 cleanup 모드도 있다. 이 경로는 오래된 자산 표시·재로딩 분석 시 확인할 곳이지 단순 불필요 코드로 확정한 것이 아니다.

Google Analytics는 production 환경에서만 삽입한다. highlight.js 본체·Handlebars 언어와 Google Fonts는 외부 요청이며 다른 여러 라이브러리는 `static/`에 있다. 개발 검증은 `--environment development`로 production Analytics 삽입을 피할 수 있다. Naver 블로그 인앱 브라우저 이탈 처리는 `inapp-browser-escape.js`에 있으며 최근 커밋에서 대상을 제한한 기능이다.

## 9. 후속 작업의 검증 기준

### 최소 시나리오

1. 홈/카테고리/검색 → 글 → 복귀 링크 → 브라우저 뒤로/앞으로. 글 → 다른 글, About 진입·복귀도 포함.
2. 글 직접 URL 방문, hash 직접 방문, 새로고침 스크롤 복원, 이미지 로드 이후 위치 변화.
3. cover만 있는 글, thumbnail만 있는 글, 둘 다 없는 글, 제목이 없어서 목차가 비는 글.
4. Markdown 이미지와 shortcode 이미지, caption, columns, 확대 이미지 교체·휠·드래그·Escape.
5. 모바일 메뉴·목차·검색의 열기/닫기, 동시에 열기 시도, 화면 회전, 주소창 높이 변화, 키보드 표시.
6. 긴 제목·태그·코드·표의 줄바꿈과 가로 넘침. 검색 필터와 pagination URL 유지.
7. reduced-motion, 키보드 초점·복귀, JavaScript 비활성화 시 기본 탐색. 버튼을 늘리지 않고 접근성 의미를 유지할 수 있는지도 확인.

폭은 최소 360/390px, 768px, menu 경계 전후(약 1238px), 1440px에서 확인하는 것을 제안한다. 이는 검증 제안이며 확정된 모바일 디자인 사양은 아니다. 초기화 때만 스크롤 컨테이너를 선택하는 코드가 있어 데스크톱↔모바일 resize는 특별히 확인한다.

### 미리보기 도구의 실제 제약

기존 명령은 개발 사이트 루트에서 다음처럼 사용한다.

```bash
bash tools/preview.sh --file content/posts/etc/notes/2023-knou-c-study-7/index.md
```

- `--file`은 선택한 bundle과 홈·검색을 `/tmp/varofla-hugo-preview/source`로 복사하고 그곳에서 카테고리를 생성한다. About은 자동 포함하지 않는다.
- 인자 없이 실행하면 전체 콘텐츠를 대상으로 하고 개발 원본의 카테고리를 재생성한다. 축소 테스트에는 사용하지 않는다.
- 필터 미리보기는 `--renderToMemory`, cache는 `/tmp`; 서버는 `0.0.0.0:1313`, baseURL은 스크립트에 `http://192.168.66.20:1313`으로 고정되어 있다.
- 필터 모드에서 테마는 처음에 복사된다. 동기화 루프는 선택한 글과 카테고리만 갱신한다. **원본 테마 수정은 실행 중인 필터 미리보기에 자동 반영되지 않는다.** 재시작하거나 임시 source의 테마를 갱신해야 한다.
- `hugo.sh`는 먼저 개발 사이트의 카테고리를 재생성하고 Docker의 `/src`에 사이트만 mount한다. 컨테이너 `/tmp`와 호스트 `/tmp`는 같지 않으므로 `--destination /tmp/...`만 전달하면 호스트에서 결과를 찾을 수 있다고 가정하지 않는다.
- 특정 카테고리만 고르는 CLI 옵션은 없다. 필요하면 해당 콘텐츠만 넣은 별도 `/tmp` source를 준비한다.

### 이번에 수행한 검증

- `/tmp/varofla-context-o1ng64w5/source`에 테마·설정·static, 실제 글 bundle **1개**(`2023-knou-c-study-7`), 홈/검색/About을 복사했다. 카테고리 생성기는 `BLOG_ROOT_OVERRIDE`를 이 임시 source로 지정했다.
- 출력·cache·resource도 모두 같은 `/tmp` 루트 아래로 분리하여 아래 명령을 실행했다.

```bash
docker run --rm \
  -v /tmp/varofla-context-o1ng64w5:/work \
  -w /work/source -e TZ=Asia/Seoul \
  -e HUGO_RESOURCEDIR=/work/resources \
  hugomods/hugo:debian-non-root-0.158.0 \
  hugo --environment development \
  --destination /work/public --cacheDir /work/cache \
  --baseURL http://localhost:1313/
```

- 빌드 성공: Pages 19, Non-page files 20, Static files 79, Processed images 12. 경고·오류 없이 완료했다. 전체 104개 글을 빌드하지 않았다.
- 홈·글·About·검색·하위 카테고리 HTML 존재, 해당 페이지들의 JSON-LD 및 생성된 검색/manifest JSON 문법을 확인했다.
- About 복귀 script가 버튼보다 먼저 출력되는 것을 HTML 파싱으로 확인했다.

### 2026-09-20 찌꺼기 청소 검증

- 실제 글 bundle `esp32-c6-zigbee-home-assistant` 1개와 홈/검색/About/카테고리를 포함한 축소 빌드가 경고·오류 없이 성공했다: Pages 19, Non-page files 18, Static files 79, Processed images 5.
- 수정 전·후 Pages/Non-page/Static/Processed images/Aliases 수가 같았고, 홈·글·About·검색·카테고리 출력과 검색 데이터 3종·manifest JSON의 문법을 확인했다.
- 임시 Markdown 이미지 fixture를 추가한 2개 글 빌드도 성공했다. `.md-image` wrapper, alt/title/size 속성, image-zoom 스크립트는 유지되고 삭제 대상 control은 출력에 남지 않았다.
- `exampleSite`/workflow/`go.mod`와 번역 링크 경로 제거 후 같은 실제 글 1개 축소 빌드가 다시 성공했다: Pages 19, Non-page files 18, Static files 79, Processed images 5. 출력 HTML의 `lang=ko-kr`와 JSON-LD `inLanguage=ko`는 유지되고 번역용 `hreflang`은 생성되지 않는 것을 확인했다.

### 2026-09-20 모바일 구현 검증

- 실제 글 bundle `2023-knou-c-study-7` 하나와 홈/검색/카테고리를 `/tmp/varofla-mobile-pzgdCY`에서 축소 빌드했다. Hugo 0.158.0 extended 기준 Pages 18, Non-page files 20, Static files 79, Processed images 12로 경고·오류 없이 성공했다.
- Chrome 151 headless에서 360/390/768px과 데스크톱 resize를 확인했다. 360px에서 문서 폭 넘침이 없었고, 메뉴·목차·검색의 상호 배타 상태, `aria-hidden`/`inert`, body scroll lock, 데스크톱 복귀 상태를 런타임 값으로 확인했다.
- 상단 목차 시트는 390×844px에서 짧은 실제 목차가 약 287px 높이까지만 열렸다. 항목을 늘린 긴 목차는 화면 90% 지점인 약 760px에서 멈췄고 `scrollHeight 928px / clientHeight 703px`로 내부 스크롤 전환과 가로 넘침 없음도 확인했다.
- 열린 목차의 `toc-cover`를 확대해 medium-zoom 배경 1100, 이미지 1101이 목차 1001과 헤더 1002 위에 렌더링되는 것을 확인했다. 확대 배경을 눌러 닫은 뒤에도 `toc-control`, `.overlay-mode`, `mobile-toc-open` 상태가 유지됐다.
- 글의 두 번째 제목으로 이동했을 때 상단 문구가 `배열의 구조`로 바뀌었다. 합성 touch Pointer Events로 확대 이미지 폭이 370px에서 약 569px로 커져 pinch 경로가 실행되는 것을 확인했다.
- 변경한 JavaScript 5개의 구문을 Node.js 22로 검사했다. 페이지 콘솔에서는 개발 baseURL이 Comentario 등록 도메인이 아니어서 발생한 외부 댓글 promise 오류만 관찰했으며 테마 스크립트 오류는 없었다.
- Chrome headless 렌더링과 전환은 확인했지만 모바일 실기기에서는 아직 검증하지 않았다.
- 위 임시 경로는 분석 당시 결과물이다. `/tmp`가 정리되면 재생성해야 하며 복사된 테마는 이후 수정과 자동 동기화되지 않는다.

## 10. 사용자에게 확인할 시점

**결정 완료:** 범용 테마 지원보다 varofla 전용 관리에 초점을 두고, 한국어 단일 언어만 제공한다. `exampleSite`와 원본 배포 workflow는 제거했다. 모바일은 현재 위치 sticky bar, 왼쪽 메뉴 패널, 상단 목차 시트, 작은 화면 전체 검색, 상호 배타 상태로 구현했다.

아래는 문서 작성을 막지 않으며 실제 해당 작업을 시작할 때 확인한다. 지금 임의로 선택하지 않았다.

- 청소: 미사용 shortcode, 현재 공사 공지, SW/offline 유지 여부 등 실제 기능·운영 범위를 바꾸는 항목.
- 모바일: 실제 iOS/Android에서 주소창·키보드·safe area와 pinch 감각을 확인하고 필요한 보정만 한다. 별도 swipe 이미지 이동은 현재 사양에 포함하지 않았다.
- About: 프로젝트 갤러리의 배치·이미지 순서·연도 구분은 위와 같이 결정되었다. Skills·소개 문구·프로젝트 외 영역은 이후 별도 요청을 따른다.

구조 정리와 기능 변경을 한 번에 섞지 않고, 현재 동작을 기준으로 작은 단위의 변경과 위 시나리오 검증을 반복하는 것을 제안한다.
