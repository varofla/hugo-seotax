document.addEventListener("DOMContentLoaded", function () {
  function getCurrentCategory() {
    const currentUrl = new URL(window.location.href);

    // 1) 검색 페이지: /search/?category1=...&category2=...
    const category1 = currentUrl.searchParams.get("category1");
    const category2 = currentUrl.searchParams.get("category2");
    if (category1 || category2) {
      return { category1, category2 };
    }

    // 2) 게시글 페이지: 헤더의 카테고리 링크에서 추출
    const categoryLink = document.querySelector(".content-category-link");
    if (categoryLink) {
      try {
        const linkUrl = new URL(categoryLink.getAttribute("href"), window.location.origin);
        return {
          category1: linkUrl.searchParams.get("category1"),
          category2: linkUrl.searchParams.get("category2"),
        };
      } catch (e) {
        // ignore
      }
    }

    return { category1: null, category2: null };
  }

  const { category1, category2 } = getCurrentCategory();
  if (!category1) return;

  // 상위 카테고리 펼치기
  const parentLabel = document.querySelector(
    `.categories-label[data-category1="${CSS.escape(category1)}"]`
  );

  if (parentLabel) {
    const checkboxId = parentLabel.getAttribute("for");
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
      checkbox.checked = true;
    }

    // 현재 상위 카테고리 텍스트 빨간색
    const parentLink = parentLabel.querySelector("a");
    if (parentLink) {
      parentLink.style.color = "var(--color-link)";
    }
  }

  // 하위 카테고리도 있으면 해당 항목 텍스트 빨간색
  if (category2) {
    const childLink = document.querySelector(
      `.categories-label a[href*="category1=${encodeURIComponent(category1)}"][href*="category2=${encodeURIComponent(category2)}"]`
    );

    if (childLink) {
      childLink.style.color = "var(--color-link)";
    }
  }
});