document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });

    analyzePage();
});

function switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

function analyzePage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: getSEOData
        }, displayResults);
    });
}

function getSEOData() {
    // Get all text content
    const textContent = document.body.innerText;
    const words = textContent.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['and', 'the', 'for', 'that', 'this', 'with'].includes(word));

    // Count word frequency
    const wordFrequency = {};
    words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Get headers with their content
    const headers = {};
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        headers[tag] = Array.from(document.getElementsByTagName(tag))
            .map(h => ({
                text: h.textContent.trim(),
                position: h.getBoundingClientRect().top
            }));
    });

    return {
        title: {
            content: document.title,
            length: document.title.length
        },
        metaDescription: {
            content: document.querySelector('meta[name="description"]')?.content || '',
            length: document.querySelector('meta[name="description"]')?.content.length || 0
        },
        headings: headers,
        images: Array.from(document.images).map(img => ({
            hasAlt: !!img.alt,
            alt: img.alt
        })),
        links: {
            total: document.links.length,
            internal: Array.from(document.links).filter(link => 
                link.hostname === window.location.hostname
            ).length,
            external: Array.from(document.links).filter(link => 
                link.hostname !== window.location.hostname
            ).length
        },
        keywords: Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
    };
}

function displayResults(results) {
    const data = results[0].result;
    
    // Display basic SEO results
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="analysis-section">';

    // Title analysis
    addResult(resultsDiv, 'Page Title Optimization', data.title.content, 
        `Length: ${data.title.length}/60 characters ${data.title.length >= 30 && data.title.length <= 60 ? '(Optimal)' : '(Needs Adjustment)'}`,
        data.title.length >= 30 && data.title.length <= 60);

    // Meta description analysis
    addResult(resultsDiv, 'Meta Description Impact', data.metaDescription.content,
        `Length: ${data.metaDescription.length}/160 characters ${data.metaDescription.length >= 120 && data.metaDescription.length <= 160 ? '(Optimal)' : '(Needs Adjustment)'}`,
        data.metaDescription.length >= 120 && data.metaDescription.length <= 160);

    // Image optimization analysis
    const imagesWithoutAlt = data.images.filter(img => !img.hasAlt).length;
    const totalImages = data.images.length;
    const imageOptimizationRate = ((totalImages - imagesWithoutAlt) / totalImages * 100).toFixed(1);
    
    addResult(resultsDiv, 'Image Optimization', 
        `Optimization Rate: ${imageOptimizationRate}%`,
        `${totalImages} total images, ${imagesWithoutAlt} need alt text optimization`,
        imagesWithoutAlt === 0);

    // Link structure analysis
    const linkDistribution = (data.links.internal / (data.links.total || 1) * 100).toFixed(1);
    addResult(resultsDiv, 'Link Architecture',
        `Distribution: ${linkDistribution}% internal links`,
        `Total: ${data.links.total} (Internal: ${data.links.internal}, External: ${data.links.external})`,
        data.links.internal > 0 && data.links.external > 0);

    // Display keywords with enhanced UI
    const keywordsDiv = document.getElementById('keyword-results');
    keywordsDiv.innerHTML = `
        <h3>Strategic Keywords Analysis</h3>
        <p class="subtitle">Top performing keywords by frequency</p>
    `;
    
    data.keywords.forEach(([word, count]) => {
        const keywordItem = document.createElement('div');
        keywordItem.className = 'keyword-item';
        keywordItem.innerHTML = `
            <div class="keyword-content">
                <span class="keyword-text">${word}</span>
                <button class="highlight-btn" title="Toggle highlight">&#9998;</button>
            </div>
            <span class="keyword-count">${count} occurrences (${((count / data.keywords.reduce((acc, [,c]) => acc + c, 0)) * 100).toFixed(1)}%)</span>
        `;

        // Add click handler for the highlight button
        const highlightBtn = keywordItem.querySelector('.highlight-btn');
        let isHighlighted = false;

        highlightBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent keyword item click
            isHighlighted = !isHighlighted; // Toggle state
            
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (isHighlighted) {
                    // Add highlighting
                    chrome.scripting.insertCSS({
                        target: { tabId: tabs[0].id },
                        css: `.keyword-highlight { background-color: #ffd700 !important; border-radius: 2px; }`
                    });
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: highlightKeyword,
                        args: [word]
                    });
                    highlightBtn.classList.add('active');
                } else {
                    // Remove highlighting
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: removeHighlights
                    });
                    highlightBtn.classList.remove('active');
                }
            });
        });

        keywordsDiv.appendChild(keywordItem);
    });

    // Enhanced header structure display
    const headersDiv = document.getElementById('header-results');
    headersDiv.innerHTML = '<h3>Content Hierarchy Analysis</h3>';
    
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        if (data.headings[tag].length > 0) {
            const headerSection = document.createElement('div');
            headerSection.className = 'header-section';
            headerSection.innerHTML = `
                <h4>${tag.toUpperCase()} Elements (${data.headings[tag].length})</h4>
                <div class="header-distribution">
                    <div class="header-bar" style="width: ${(data.headings[tag].length / Object.values(data.headings).flat().length * 100)}%"></div>
                </div>
            `;
            
            data.headings[tag].forEach(header => {
                const headerItem = document.createElement('div');
                headerItem.className = 'header-item';
                headerItem.innerHTML = `
                    <div class="header-content">${header.text}</div>
                    <small>Position: ${Math.round(header.position)}px from top</small>
                `;
                headerSection.appendChild(headerItem);
            });
            
            headersDiv.appendChild(headerSection);
        }
    });
}

function addResult(container, title, content, description, isGood) {
    const div = document.createElement('div');
    div.className = `result-item ${isGood ? 'good' : 'warning'}`;
    div.innerHTML = `
        <strong>${title}</strong>
        <div class="content">${content}</div>
        <small>${description}</small>
        ${isGood ? 
            '<span class="status-badge success">Optimized</span>' : 
            '<span class="status-badge warning">Needs Attention</span>'
        }
    `;
    container.appendChild(div);
}

document.getElementById('exportBtn').addEventListener('click', exportToExcel);

function exportToExcel() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: getSEOData
        }, (results) => {
            const data = results[0].result;
            
            // XML template for Excel with styling
            let excelTemplate = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Author>Shreyash</Author>
        <Created>${new Date().toISOString()}</Created>
    </DocumentProperties>
    <Styles>
        <Style ss:ID="Header">
            <Font ss:Bold="1" ss:Size="14" ss:Color="#FFFFFF"/>
            <Interior ss:Color="#1a73e8" ss:Pattern="Solid"/>
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        </Style>
        <Style ss:ID="SubHeader">
            <Font ss:Bold="1" ss:Size="12" ss:Color="#1a73e8"/>
            <Interior ss:Color="#E8F0FE" ss:Pattern="Solid"/>
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
        </Style>
        <Style ss:ID="Good">
            <Font ss:Color="#0f9d58"/>
            <Interior ss:Color="#E6F4EA" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="Warning">
            <Font ss:Color="#f4b400"/>
            <Interior ss:Color="#FEF7E0" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="Default">
            <Font ss:Size="11"/>
            <Alignment ss:Vertical="Center"/>
        </Style>
    </Styles>
    <Worksheet ss:Name="SEO Analysis">
        <Table ss:DefaultColumnWidth="140">`;

            // Add title section
            excelTemplate += `
            <Row ss:Height="30">
                <Cell ss:StyleID="Header" ss:MergeAcross="3"><Data ss:Type="String">SEO Analysis Report - Generated by Shreyash's SEO Assistant</Data></Cell>
            </Row>
            <Row ss:Height="25">
                <Cell ss:StyleID="SubHeader" ss:MergeAcross="3"><Data ss:Type="String">Page Title Analysis</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">Content</Data></Cell>
                <Cell ss:MergeAcross="2"><Data ss:Type="String">${data.title.content}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">Length</Data></Cell>
                <Cell><Data ss:Type="Number">${data.title.length}</Data></Cell>
                <Cell ss:StyleID="${data.title.length >= 30 && data.title.length <= 60 ? 'Good' : 'Warning'}">
                    <Data ss:Type="String">${data.title.length >= 30 && data.title.length <= 60 ? 'Optimal' : 'Needs Adjustment'}</Data>
                </Cell>
            </Row>`;

            // Add meta description section
            excelTemplate += `
            <Row ss:Height="25">
                <Cell ss:StyleID="SubHeader" ss:MergeAcross="3"><Data ss:Type="String">Meta Description</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">Content</Data></Cell>
                <Cell ss:MergeAcross="2"><Data ss:Type="String">${data.metaDescription.content}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">Length</Data></Cell>
                <Cell><Data ss:Type="Number">${data.metaDescription.length}</Data></Cell>
                <Cell ss:StyleID="${data.metaDescription.length >= 120 && data.metaDescription.length <= 160 ? 'Good' : 'Warning'}">
                    <Data ss:Type="String">${data.metaDescription.length >= 120 && data.metaDescription.length <= 160 ? 'Optimal' : 'Needs Adjustment'}</Data>
                </Cell>
            </Row>`;

            // Add keywords section
            excelTemplate += `
            <Row ss:Height="25">
                <Cell ss:StyleID="SubHeader" ss:MergeAcross="3"><Data ss:Type="String">Top Keywords</Data></Cell>
            </Row>
            <Row>
                <Cell ss:StyleID="Header"><Data ss:Type="String">Keyword</Data></Cell>
                <Cell ss:StyleID="Header"><Data ss:Type="String">Occurrences</Data></Cell>
                <Cell ss:StyleID="Header"><Data ss:Type="String">Percentage</Data></Cell>
            </Row>`;

            data.keywords.forEach(([word, count]) => {
                const percentage = ((count / data.keywords.reduce((acc, [,c]) => acc + c, 0)) * 100).toFixed(1);
                excelTemplate += `
                <Row>
                    <Cell><Data ss:Type="String">${word}</Data></Cell>
                    <Cell><Data ss:Type="Number">${count}</Data></Cell>
                    <Cell><Data ss:Type="String">${percentage}%</Data></Cell>
                </Row>`;
            });

            // Add Content Structure section
            excelTemplate += `
            <Row ss:Height="40">
                <Cell ss:StyleID="SubHeader" ss:MergeAcross="3"><Data ss:Type="String">Content Structure Analysis</Data></Cell>
            </Row>`;

            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                if (data.headings[tag].length > 0) {
                    // Add header type row
                    excelTemplate += `
                    <Row ss:Height="30">
                        <Cell ss:StyleID="Header" ss:MergeAcross="3">
                            <Data ss:Type="String">${tag.toUpperCase()} Headers (${data.headings[tag].length})</Data>
                        </Cell>
                    </Row>
                    <Row>
                        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Content</Data></Cell>
                        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Position</Data></Cell>
                        <Cell ss:StyleID="SubHeader" ss:MergeAcross="1"><Data ss:Type="String">Analysis</Data></Cell>
                    </Row>`;

                    // Add individual headers
                    data.headings[tag].forEach((header, index) => {
                        const position = Math.round(header.position);
                        const isGoodPosition = position >= 0; // You can add more sophisticated position analysis here

                        excelTemplate += `
                        <Row>
                            <Cell><Data ss:Type="String">${header.text}</Data></Cell>
                            <Cell><Data ss:Type="Number">${position}</Data></Cell>
                            <Cell ss:StyleID="${isGoodPosition ? 'Good' : 'Warning'}" ss:MergeAcross="1">
                                <Data ss:Type="String">${isGoodPosition ? 'Good placement' : 'Check positioning'}</Data>
                            </Cell>
                        </Row>`;
                    });

                    // Add spacing row
                    excelTemplate += `
                    <Row ss:Height="15">
                        <Cell ss:MergeAcross="3"><Data ss:Type="String"></Data></Cell>
                    </Row>`;
                }
            });

            // Add header hierarchy analysis
            const totalHeaders = Object.values(data.headings).reduce((sum, headers) => sum + headers.length, 0);
            excelTemplate += `
            <Row ss:Height="30">
                <Cell ss:StyleID="SubHeader" ss:MergeAcross="3">
                    <Data ss:Type="String">Header Distribution Summary</Data>
                </Cell>
            </Row>`;

            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
                const count = data.headings[tag].length;
                const percentage = ((count / totalHeaders) * 100).toFixed(1);
                excelTemplate += `
                <Row>
                    <Cell><Data ss:Type="String">${tag.toUpperCase()}</Data></Cell>
                    <Cell><Data ss:Type="Number">${count}</Data></Cell>
                    <Cell ss:MergeAcross="1">
                        <Data ss:Type="String">${percentage}% of total headers</Data>
                    </Cell>
                </Row>`;
            });

            // Add total headers row
            excelTemplate += `
            <Row ss:StyleID="SubHeader">
                <Cell><Data ss:Type="String">Total Headers</Data></Cell>
                <Cell><Data ss:Type="Number">${totalHeaders}</Data></Cell>
                <Cell ss:MergeAcross="1"><Data ss:Type="String">100%</Data></Cell>
            </Row>`;

            // Close the XML structure
            excelTemplate += `
        </Table>
    </Worksheet>
</Workbook>`;

            // Create and trigger download
            const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `seo-analysis-${date}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    });
}

// Add this function to handle keyword highlighting
function highlightKeywordInPage(keyword) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: findAndHighlightKeyword,
            args: [keyword]
        });
    });
}

// Add this function that will be injected into the page
function findAndHighlightKeyword(keyword) {
    // First remove any existing highlights
    const highlights = document.querySelectorAll('.keyword-highlight');
    highlights.forEach(highlight => {
        const text = highlight.textContent;
        highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
    });

    // Function to highlight text in a node
    function highlightTextInNode(textNode, searchText) {
        const text = textNode.textContent;
        const index = text.toLowerCase().indexOf(searchText.toLowerCase());
        
        if (index >= 0) {
            const before = text.substring(0, index);
            const match = text.substring(index, index + searchText.length);
            const after = text.substring(index + searchText.length);
            
            const span = document.createElement('span');
            span.className = 'keyword-highlight';
            span.textContent = match;
            
            const fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(span);
            if (after) fragment.appendChild(document.createTextNode(after));
            
            textNode.parentNode.replaceChild(fragment, textNode);
            return true;
        }
        return false;
    }

    // Walk through all text nodes in the document
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (!node.parentElement ||
                    node.parentElement.tagName === 'SCRIPT' ||
                    node.parentElement.tagName === 'STYLE' ||
                    node.parentElement.tagName === 'NOSCRIPT' ||
                    node.parentElement.classList.contains('keyword-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node;
    let highlightCount = 0;
    let firstHighlight = null;
    const textNodes = [];
    
    // Collect all valid text nodes first
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    // Process the text nodes
    textNodes.forEach(textNode => {
        if (highlightTextInNode(textNode, keyword)) {
            highlightCount++;
            if (!firstHighlight) {
                firstHighlight = document.querySelector('.keyword-highlight');
            }
        }
    });

    // Scroll to the first highlight if found
    if (firstHighlight) {
        firstHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    return highlightCount;
}

function removeExistingHighlights() {
    const highlights = document.querySelectorAll('.keyword-highlight');
    highlights.forEach(highlight => {
        const text = highlight.textContent;
        const textNode = document.createTextNode(text);
        highlight.parentNode.replaceChild(textNode, highlight);
    });
}

function highlightKeyword(keyword) {
    // Remove existing highlights
    document.querySelectorAll('.keyword-highlight').forEach(el => {
        const text = el.textContent;
        el.parentNode.replaceChild(document.createTextNode(text), el);
    });

    const regex = new RegExp(keyword, 'gi');
    const textNodes = [];
    
    // Get all text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent || 
                    parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE' || 
                    parent.tagName === 'NOSCRIPT' || 
                    parent.classList.contains('keyword-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    let firstHighlight = null;

    // Process each text node
    textNodes.forEach(node => {
        const matches = node.textContent.match(regex);
        if (!matches) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        regex.lastIndex = 0;
        while ((match = regex.exec(node.textContent)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex, match.index)));
            }

            const span = document.createElement('span');
            span.className = 'keyword-highlight';
            span.textContent = match[0];
            fragment.appendChild(span);

            if (!firstHighlight) firstHighlight = span;
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < node.textContent.length) {
            fragment.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    });

    // Scroll to first highlight
    if (firstHighlight) {
        firstHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function removeHighlights() {
    const highlights = document.querySelectorAll('.keyword-highlight');
    highlights.forEach(highlight => {
        const text = highlight.textContent;
        highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
    });
}

function displayPerformanceMetrics() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: getPerformanceMetrics
    }, (results) => {
      const metrics = results[0].result;
      updateTimelineGraph(metrics);
      updateMetricsTable(metrics);
    });
  });
}

function updateTimelineGraph(metrics) {
  const timelinePhases = document.querySelector('.timeline-phases');
  const timelineMarkers = document.querySelector('.timeline-markers');
  
  // Clear existing content
  timelinePhases.innerHTML = '';
  timelineMarkers.innerHTML = '';

  // Calculate total duration for scaling
  const totalDuration = metrics.loadEventEnd;
  
  // Create phases
  const phases = [
    {
      name: 'dns',
      start: metrics.domainLookupStart,
      end: metrics.domainLookupEnd
    },
    {
      name: 'connecting',
      start: metrics.connectStart,
      end: metrics.connectEnd
    },
    {
      name: 'sending',
      start: metrics.requestStart,
      end: metrics.responseStart
    },
    {
      name: 'receiving',
      start: metrics.responseStart,
      end: metrics.responseEnd
    },
    {
      name: 'dom',
      start: metrics.domLoading,
      end: metrics.domComplete
    }
  ];

  // Add phase elements
  phases.forEach(phase => {
    if (phase.start && phase.end) {
      const width = ((phase.end - phase.start) / totalDuration) * 100;
      const left = (phase.start / totalDuration) * 100;
      
      const phaseElement = document.createElement('div');
      phaseElement.className = `timeline-phase ${phase.name}`;
      phaseElement.style.width = `${width}%`;
      phaseElement.style.left = `${left}%`;
      timelinePhases.appendChild(phaseElement);
    }
  });

  // Add time markers
  const markers = [0, 25, 50, 75, 100];
  markers.forEach(percent => {
    const time = (totalDuration * percent) / 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.style.left = `${percent}%`;
    marker.setAttribute('data-time', `${Math.round(time)}ms`);
    timelineMarkers.appendChild(marker);
  });
}

function updateMetricsTable(metrics) {
  const tableBody = document.getElementById('metricsTableBody');
  tableBody.innerHTML = '';

  const events = [
    { name: 'Redirect', start: metrics.redirectStart, end: metrics.redirectEnd },
    { name: 'DNS Lookup', start: metrics.domainLookupStart, end: metrics.domainLookupEnd },
    { name: 'TCP Connect', start: metrics.connectStart, end: metrics.connectEnd },
    { name: 'Request', start: metrics.requestStart, end: metrics.responseStart },
    { name: 'Response', start: metrics.responseStart, end: metrics.responseEnd },
    { name: 'DOM Processing', start: metrics.domLoading, end: metrics.domComplete },
    { name: 'Load Event', start: metrics.loadEventStart, end: metrics.loadEventEnd }
  ];

  events.forEach(event => {
    if (event.start && event.end) {
      const duration = event.end - event.start;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${event.name}</td>
        <td>${event.start.toFixed(1)} ms</td>
        <td>${duration.toFixed(1)} ms</td>
        <td>${event.end.toFixed(1)} ms</td>
      `;
      tableBody.appendChild(row);
    }
  });
}

function getPerformanceMetrics() {
  const timing = performance.timing;
  const navigationStart = timing.navigationStart;
  
  return {
    redirectStart: timing.redirectStart > 0 ? timing.redirectStart - navigationStart : 0,
    redirectEnd: timing.redirectEnd > 0 ? timing.redirectEnd - navigationStart : 0,
    domainLookupStart: timing.domainLookupStart - navigationStart,
    domainLookupEnd: timing.domainLookupEnd - navigationStart,
    connectStart: timing.connectStart - navigationStart,
    connectEnd: timing.connectEnd - navigationStart,
    requestStart: timing.requestStart - navigationStart,
    responseStart: timing.responseStart - navigationStart,
    responseEnd: timing.responseEnd - navigationStart,
    domLoading: timing.domLoading - navigationStart,
    domComplete: timing.domComplete - navigationStart,
    loadEventStart: timing.loadEventStart - navigationStart,
    loadEventEnd: timing.loadEventEnd - navigationStart
  };
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Existing listeners...
  
  // Add performance button listener
  document.getElementById('performanceBtn').addEventListener('click', () => {
    document.querySelector('[data-tab="performance"]').click();
  });

  // Add tab switching logic for performance tab
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
      
      // Load performance metrics if performance tab is selected
      if (button.dataset.tab === 'performance') {
        displayPerformanceMetrics();
      }
    });
  });
});



