'use strict';

$(document).ready(function() {
  const CustomSearch = {
    init: function() {
      this.bindEvents();
    },

    bindEvents: function() {
      const form = document.getElementById('category-search');
      const topicsContainer = document.getElementById('topics-container');
      
      if (!form || !topicsContainer) return;

      // Store original HTML to restore when search is cleared
      const originalTopicsHTML = topicsContainer.innerHTML;

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await CustomSearch.performSearch(form, topicsContainer, originalTopicsHTML);
      });

      // Real-time search (optional)
      const searchInput = form.querySelector('input[name="term"]');
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(async () => {
            await CustomSearch.performSearch(form, topicsContainer, originalTopicsHTML);
          }, 500); // Debounce for 500ms
        });
      }
    },

    performSearch: async function(form, topicsContainer, originalTopicsHTML) {
      const term = form.querySelector('input[name="term"]').value.trim();
      const category = form.querySelector('input[name="in"]').value;

      console.log("Search - term:", term, "category:", category);

      if (!term) {
        topicsContainer.innerHTML = originalTopicsHTML;
        return;
      }

      // Show loading state
      topicsContainer.innerHTML = '<li class="p-3 text-center"><i class="fa fa-spinner fa-spin"></i> Searching...</li>';

      try {
        const response = await this.fetchSearchResults(term, category);
        this.renderResults(response.results, topicsContainer);
      } catch (error) {
        console.error('Search error:', error);
        topicsContainer.innerHTML = '<li class="p-3 text-danger">Error performing search. Please try again.</li>';
      }
    },

    fetchSearchResults: async function(term, category) {
      const params = new URLSearchParams({
        term: term,
        ...(category && { in: category })
      });

      const response = await fetch(`/api/custom-search?${params}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search API error:', response.status, errorText);
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    },

    renderResults: function(results, container) {
      container.innerHTML = '';

      if (!results || !results.length) {
        container.innerHTML = '<li class="p-3 text-muted">No results found.</li>';
        return;
      }

      results.forEach(item => {
        const topic = item.topic || {};
        const post = item.post || {};
        const user = item.user || {};
        const category = item.category || {};

        // Create snippet from post content
        const snippet = this.createSnippet(post.content || topic.title || '', 200);
        const postUrl = `/topic/${topic.tid}/${topic.slug}${post.pid ? '/' + post.pid : ''}`;
        const timeAgo = this.timeAgo(post.timestamp || topic.timestamp);

        const html = `
          <li class="category-item hover-parent border-bottom py-3 py-lg-4 d-flex flex-column flex-lg-row align-items-start" 
              data-tid="${topic.tid}" data-type="${item.type}">
            <div class="d-flex p-0 col-12 col-lg-7 gap-2 gap-lg-3 pe-1 align-items-start">
              <div class="flex-grow-1">
                <h3 class="title text-break fs-5 fw-semibold m-0">
                  <a class="text-reset" href="${postUrl}">${this.escapeHtml(topic.title || 'Untitled')}</a>
                  ${item.type === 'post' ? '<small class="text-muted ms-2">(Post)</small>' : ''}
                </h3>
                ${snippet ? `<p class="text-muted mt-1 mb-0">${snippet}</p>` : ''}
                ${category.name ? `<small class="text-muted">in ${this.escapeHtml(category.name)}</small>` : ''}
              </div>
            </div>
            <div class="d-flex p-0 col-lg-5 col-12 align-content-stretch">
              <div class="meta stats d-none d-lg-flex col-12 gap-2 pe-2 text-muted align-items-center justify-content-end">
                <span>${this.escapeHtml(user.username || 'Unknown')}</span>
                ${timeAgo ? `<span class="ms-2">${timeAgo}</span>` : ''}
                <span class="ms-2 badge bg-secondary">${item.score || 0}</span>
              </div>
            </div>
          </li>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    },

    createSnippet: function(content, maxLength) {
      if (!content) return '';
      
      // Remove HTML tags
      const textContent = content.replace(/(<([^>]+)>)/gi, '');
      
      if (textContent.length <= maxLength) {
        return this.escapeHtml(textContent);
      }
      
      return this.escapeHtml(textContent.slice(0, maxLength)) + '...';
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    timeAgo: function(timestamp) {
      if (!timestamp) return '';
      
      const now = Date.now();
      const diff = now - timestamp;
      
      const minute = 60 * 1000;
      const hour = minute * 60;
      const day = hour * 24;
      const week = day * 7;
      const month = day * 30;
      const year = day * 365;
      
      if (diff < minute) return 'just now';
      if (diff < hour) return Math.floor(diff / minute) + 'm ago';
      if (diff < day) return Math.floor(diff / hour) + 'h ago';
      if (diff < week) return Math.floor(diff / day) + 'd ago';
      if (diff < month) return Math.floor(diff / week) + 'w ago';
      if (diff < year) return Math.floor(diff / month) + 'mo ago';
      return Math.floor(diff / year) + 'y ago';
    }
  };

  // Initialize when DOM is ready
  CustomSearch.init();
});