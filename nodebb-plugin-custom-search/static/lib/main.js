'use strict';

$(document).ready(function() {
  const CustomSearch = {
    MIN_CHARS: 3,
    originalTopicsHTML: null,
    
    init: function() {
      const topicsContainer = document.getElementById('topics-container');
      if (topicsContainer) {
        this.originalTopicsHTML = topicsContainer.innerHTML;
      }
      this.bindEvents();
    },

    bindEvents: function() {
      const form = document.getElementById('category-search');
      const topicsContainer = document.getElementById('topics-container');
      
      if (!form || !topicsContainer) {
        console.warn('Search form or topics container not found');
        return;
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.performSearch(form, topicsContainer);
      });

      const searchInput = form.querySelector('input[name="term"]');
      if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
          clearTimeout(searchTimeout);
          const val = (searchInput.value || '').trim();
          
          if (val.length < this.MIN_CHARS) {
            this.restoreOriginal(topicsContainer);
            return;
          }

          searchTimeout = setTimeout(async () => {
            await this.performSearch(form, topicsContainer);
          }, 300); // Reduced debounce for faster response
        });

        // Check for initial value and trigger search immediately
        const initialVal = (searchInput.value || '').trim();
        if (initialVal.length >= this.MIN_CHARS) {
          // Trigger immediately without waiting
          this.performSearch(form, topicsContainer);
        }
      } else {
        // If no search input found, check if there's a term in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlTerm = urlParams.get('term');
        if (urlTerm && urlTerm.length >= this.MIN_CHARS) {
          this.performSearch(form, topicsContainer);
        }
      }
    },

    performSearch: async function(form, topicsContainer) {
      const termInput = form.querySelector('input[name="term"]');
      const categoryInput = form.querySelector('input[name="in"]');
      
      const term = (termInput?.value || '').trim();
      const category = categoryInput?.value || '';

      if (term.length < this.MIN_CHARS) {
        this.restoreOriginal(topicsContainer);
        return;
      }

      this.showLoading(topicsContainer);

      try {
        const response = await this.fetchSearchResults(term, category);
        console.log('Search response:', response);
        
        // Use the actual template file
        await this.renderWithTemplate(response.results || [], topicsContainer);
      } catch (error) {
        console.error('Search error:', error);
        this.showError(topicsContainer, 'Error performing search. Please try again.');
      }
    },

    fetchSearchResults: async function(term, category) {
      const params = new URLSearchParams({
        term: term,
        asAdmin: '1'
      });
      
      if (category) {
        params.append('in', category);
      }

      const url = `/api/custom-search?${params}`;
      console.log('Fetching:', url);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    },

    renderWithTemplate: async function(results, container) {
      if (!results || results.length === 0) {
        this.showNoResults(container);
        return;
      }

      if (!window.app || !app.parseAndTranslate) {
        console.error('NodeBB template engine not available');
        this.showError(container, 'Template engine not available');
        return;
      }

      try {
        // Transform search results into topic format
        const topicsData = this.transformSearchResultsToTopics(results);
        
        // Get the current page's template data to maintain consistency
        const templateData = {
          topics: topicsData,
          showSelect: ajaxify.data.showSelect || false,
          template: ajaxify.data.template || {},
          config: config,
          'reputation:disabled': ajaxify.data['reputation:disabled'] || false
        };
        
        // Use NodeBB's template system to render the topics_list.tpl partial
        // The 'topics' here refers to the block name in the template
        const html = await app.parseAndTranslate('partials/topics_list', templateData);
        
        container.innerHTML = '';
        $(container).append(html);
        
        // Re-initialize NodeBB components
        $(document).trigger('action:topics.loaded', { topics: topicsData });
        
        // Re-run timeago
        if ($.fn.timeago) {
          $(container).find('.timeago').timeago();
        }
        
      } catch (error) {
        console.error('Template rendering error:', error);
        // Try alternative template path
        this.tryAlternativeRender(results, container);
      }
    },

    tryAlternativeRender: async function(results, container) {
      try {
        const topicsData = this.transformSearchResultsToTopics(results);
        
        // Try rendering with the category template directly
        const html = await app.parseAndTranslate('category', 'topics', {
          topics: topicsData,
          showSelect: false,
          config: config
        });
        
        container.innerHTML = '';
        $(container).append(html);
        
        if ($.fn.timeago) {
          $(container).find('.timeago').timeago();
        }
        
      } catch (error) {
        console.error('Alternative rendering failed:', error);
        this.showError(container, 'Error displaying results');
      }
    },

    transformSearchResultsToTopics: function(results) {
      return results.map((item, index) => {
        const topic = item.topic || {};
        const user = item.user || {};
        const category = item.category || {};
        const teaser = item.teaser || {};
        
        // Build a complete topic object matching NodeBB's structure
        return {
          tid: item.tid || topic.tid,
          title: item.title || topic.title || 'Untitled',
          slug: item.slug || topic.slug || (item.tid || topic.tid),
          index: index,
          
          user: {
            uid: user.uid || 0,
            username: user.username || '',
            userslug: user.userslug || '',
            displayname: user.displayname || user.username || '',
            picture: user.picture || '',
            'icon:text': user['icon:text'] || (user.username ? user.username[0].toUpperCase() : '?'),
            'icon:bgColor': user['icon:bgColor'] || '#aaa'
          },
          
          postcount: item.postcount || topic.postcount || 0,
          viewcount: item.viewcount || topic.viewcount || 0,
          votes: item.votes || topic.votes || 0,
          
          timestamp: item.timestamp || topic.timestamp || Date.now(),
          timestampISO: new Date(item.timestamp || topic.timestamp || Date.now()).toISOString(),
          lastposttime: topic.lastposttime || item.timestamp || Date.now(),
          
          category: {
            cid: category.cid || '',
            name: category.name || '',
            slug: category.slug || '',
            icon: category.icon || '',
            bgColor: category.bgColor || '#3498db',
            color: category.color || '#fff',
            imageClass: category.imageClass || ''
          },
          
          tags: (item.tags || topic.tags || []).map(tag => ({
            value: typeof tag === 'string' ? tag : tag.value,
            valueEncoded: encodeURIComponent(typeof tag === 'string' ? tag : tag.value),
            valueEscaped: typeof tag === 'string' ? tag : tag.value,
            class: (typeof tag === 'string' ? tag : tag.value).toLowerCase().replace(/[^a-z0-9]/g, '-')
          })),
          
          icons: topic.icons || [],
          pinned: topic.pinned || false,
          locked: topic.locked || false,
          deleted: topic.deleted || false,
          scheduled: topic.scheduled || false,
          followed: topic.followed || false,
          ignored: topic.ignored || false,
          
          teaser: {
            pid: teaser.pid || item.pid,
            index: teaser.index || 0,
            timestamp: teaser.timestamp || item.timestamp || Date.now(),
            timestampISO: new Date(teaser.timestamp || item.timestamp || Date.now()).toISOString(),
            user: {
              uid: teaser.user?.uid || user.uid || 0,
              username: teaser.user?.username || user.username || '',
              userslug: teaser.user?.userslug || user.userslug || '',
              displayname: teaser.user?.displayname || user.displayname || user.username || '',
              picture: teaser.user?.picture || user.picture || '',
              'icon:text': teaser.user?.['icon:text'] || user['icon:text'] || '?',
              'icon:bgColor': teaser.user?.['icon:bgColor'] || user['icon:bgColor'] || '#aaa'
            },
            content: this.stripHtml(item.content || teaser.content || item.sourceContent || '')
          },
          
          unreplied: (item.postcount || topic.postcount || 0) <= 1,
          bookmark: item.bookmark || 0,
          noAnchor: false,
          thumbs: topic.thumbs || []
        };
      });
    },

    stripHtml: function(html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    },

    restoreOriginal: function(container) {
      if (this.originalTopicsHTML) {
        container.innerHTML = this.originalTopicsHTML;
        if ($.fn.timeago) {
          $(container).find('.timeago').timeago();
        }
      }
    },

    showLoading: function(container) {
      container.innerHTML = '<li class="p-3 text-center"><i class="fa fa-spinner fa-spin"></i> Searching...</li>';
    },

    showError: function(container, message) {
      container.innerHTML = `<li class="p-3 text-danger"><i class="fa fa-exclamation-triangle"></i> ${message}</li>`;
    },

    showNoResults: function(container) {
      container.innerHTML = '<li class="p-3 text-muted"><i class="fa fa-search"></i> No results found.</li>';
    }
  };

  CustomSearch.init();
});