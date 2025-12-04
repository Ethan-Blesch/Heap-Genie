function createQuestionTemplate(text, answerElement, tooltip){
    var container = document.createElement('div');
    container.className = 'question-container';
    var textContainer = document.createElement('div');
    textContainer.className = 'question-text-wrapper';
    var questionText = document.createElement('span');
    questionText.innerHTML = text;
    textContainer.appendChild(questionText);
    
    if (tooltip) {
        var iconContainer = document.createElement('div');
        iconContainer.className = 'help-icon-container';
        
        var helpIcon = document.createElement('span');
        helpIcon.className = 'help-icon';
        helpIcon.innerText = '?';
        helpIcon.setAttribute('role', 'button');
        helpIcon.setAttribute('tabindex', '0');
        
        // Create tooltip box as a portal in document.body
        var tooltipBox = document.createElement('div');
        tooltipBox.className = 'tooltip-box';
        tooltipBox.innerHTML = tooltip;
        document.body.appendChild(tooltipBox);
        
        // Update tooltip position based on icon location
        function updateTooltipPosition() {
            var iconRect = helpIcon.getBoundingClientRect();
            var tooltipRect = tooltipBox.getBoundingClientRect();
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            var top = iconRect.top + scrollTop - tooltipRect.height - 8;
            var left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
            
            // Snap to window borders
            var padding = 8;
            
            // Left boundary
            if (left < scrollLeft + padding) {
                left = scrollLeft + padding;
            }
            
            // Right boundary
            if (left + tooltipRect.width > scrollLeft + window.innerWidth - padding) {
                left = scrollLeft + window.innerWidth - tooltipRect.width - padding;
            }
            
            // Top boundary
            if (top < scrollTop + padding) {
                top = scrollTop + padding;
            }
            
            // Bottom boundary - if tooltip goes too far down, position it below the icon instead
            if (top + tooltipRect.height > scrollTop + window.innerHeight - padding) {
                top = iconRect.bottom + scrollTop + 8;
            }
            
            tooltipBox.style.top = top + 'px';
            tooltipBox.style.left = left + 'px';
        }
        
        // Show/hide tooltip on hover
        helpIcon.addEventListener('mouseenter', function() {
            tooltipBox.classList.add('visible');
            updateTooltipPosition();
        });
        helpIcon.addEventListener('mouseleave', function() {
            // Only hide if mouse is not over tooltip
            if (!tooltipBox.matches(':hover')) {
                tooltipBox.classList.remove('visible');
            }
        });
        
        // Keep tooltip visible when hovering over it
        tooltipBox.addEventListener('mouseenter', function() {
            tooltipBox.classList.add('visible');
        });
        tooltipBox.addEventListener('mouseleave', function() {
            tooltipBox.classList.remove('visible');
        });
        
        // Show/hide tooltip on click
        helpIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            tooltipBox.classList.toggle('visible');
            if (tooltipBox.classList.contains('visible')) {
                updateTooltipPosition();
            }
        });
        
        // Hide tooltip when clicking outside (but not on tooltip itself)
        document.addEventListener('click', function(e) {
            if (!tooltipBox.contains(e.target) && !helpIcon.contains(e.target)) {
                tooltipBox.classList.remove('visible');
            }
        });
        
        // Update position on scroll
        window.addEventListener('scroll', function() {
            if (tooltipBox.classList.contains('visible')) {
                updateTooltipPosition();
            }
        });
        
        iconContainer.appendChild(helpIcon);
        textContainer.appendChild(iconContainer);
    }
    
    container.appendChild(textContainer);
    container.appendChild(answerElement);
    document.body.appendChild(container);
    return container;
}

function createAnswerTemplate(name, link){
    var container = document.createElement('div');  
    container.className = 'technique-container';
    var techniqueLink = document.createElement('a');
    techniqueLink.href = link;
    techniqueLink.innerText = name;
    container.appendChild(techniqueLink);
    return container;
}




class technique {
    tags = {}
    constructor(name, link, tags){
        this.tags = tags
        this.answerTemplate = createAnswerTemplate(name, link);
        document.getElementById("techniques").appendChild(this.answerTemplate);  
        this.hide()
    }
    hide(){
        this.answerTemplate.style.display = "none"
    }
    show(){
        this.answerTemplate.style.display = "block"
    }
}

const vulnTooltips = {
  readAfterFree: `
    Reading from freed chunks can leak pointers and leak the XOR key for 
    <a href='https://ir0nstone.gitbook.io/notes/binexp/heap/safe-linking'>safe linking.</a>
  `,
  writeAfterFree: `
    Writing to a freed chunk can let you alter the freelist & allocate at arbitrary addresses,
     or modify data once the chunk is reallocated.
  `,
  doubleFree: `
    \"Simple\" double-frees, (free()ing a pointer two consecutive times) will almost always
     make libc shit its pants. There's a lot of techniques that get around that though, 
     so double-freeing is still super useful.
  `,
  overflow: `
   Heap overflows are pretty self-explanatory, but keep in mind that
   corrupting size metadata lets you exploit without any leaks
  `,
  nullByte: `
   A controlled off-by-one lets you corrupt sizes and do shenanigans, 
   and by some combination of unsortedbins, consolidation, and fucking magic, 
   you can get overlapping chunks from a single null byte overflow.
  `,
  freeArbitraryBullshit: `
  If you can free a pointer to controlled memory, you can create 
  valid chunk metadata in memory & add a fake chunk onto the freelist. 
  Then, you can allocate and get a pointer to the stack, the globals, 
  an already-occupied place on the heap, or somewhere else spicy that 
  you're not supposed to be.
  `
};

const binTooltips = {
  tcache: `<b>Sizes:</b> <=0x400, separate bins for each size<br>
           <b>Priority:</b> First, Limited to 7 per size.<br>
           <b>Security:</b> Checks for double-frees. Uses XOR safe-linking.`,

  fastbins: `<b>Sizes:</b> <=0x80, separate bins for each size<br>
             <b>Priority:</b> Second after tcache, unlimited number per size.<br>
             <b>Security:</b> Allows double-frees if duplicate chunks aren't adjacent in the freelist. Uses safe-linking.`,

  smallbins: `<b>Sizes:</b> >0x80, <=0x400, all sizes in one list. <br>
              <b>Priority:</b> Last. Chunks are added when sorting unsortedbins.<br>
              <b>Security:</b> Doesn't use safe-linking. More metadata & doubly-linked list makes things trickier though.`,

  largebins: `<b>Sizes:</b> >0x400, all sizes in one list.<br>
              <b>Priority:</b> Last. Chunks are added when sorting unsortedbins.<br>
              <b>Security:</b> Doesn't use safe-linking. More metadata & doubly-linked list makes things trickier though.`,

  unsortedbins: `<b>Sizes:</b> >0x80, all sizes in one list.<br>
                 <b>Priority:</b> Third, after tcache & fastbins.<br>
                 <b>Security:</b> Doesn't use safe-linking. More metadata & doubly-linked list makes things trickier though.<br>
                 <b>NOTE:</b> Chunks freed to unsortedbins can trigger chunks in smallbins, largebins, 
                 and fastbins to be <a href='https://guyinatuxedo.github.io/27-edit_free_chunk/heap_consolidation_explanation/index.html'>consolidated</a> into the top of the heap.`,
                };

const constraintsTooltips = {
    consolidate: `When a large chunk (size >= 0x3f0) is freed, any free chunks 
        adjacent to the top of the heap are absorbed into it.`,

    sort: `While searching for a suitable chunk in unsortedbins, libc will sort chunks into small & large bins as it passes over them. 
        To trigger sorting of a given chunk X, you need to malloc with a size that's not 
        satisfied by chunk X or any chunks before it in the unsorted bin freelist.`,
    
    old: `Do you really need a tooltip for this one?`,

    mmap: `Large allocations (size can vary) mmap new memory. Test out the largest size you can allocate, then check for new mappings in gdb.`


};










/*


*/

//TODO: finish implementing "leak" tag 
var techniques = [
    new technique(
        "Fastbin Duplication", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/fastbin_dup.c",
        {
            bins: ["fastbins"],
            vulns: ["doublefree"],
            misc: []
        }
    ),

    new technique(
        "Fastbin dup consolidate",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/fastbin_dup_consolidate.c",
        {
            bins: ["fastbins"],
            vulns: ["doubleFree"],
            misc: []
        }
    ),
    
    new technique(
        "Unsafe unlink", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/unsafe_unlink.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow"],
            misc: []
        }
    ),
    
    new technique(
        "House of Spirit", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_spirit.c",
        {
            bins: ["fastbins"],
            vulns: ["freeArbitraryBullshit"],
            misc: []
        }
    ),

    new technique(
        "Poison null byte",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/poison_null_byte.c",
        {
            bins: ["smallbins", "largebins", "unsortedbins"],
            vulns: ["nullByte"],
            misc: [],
        }
    ),
    
    new technique(
        "House of Lore", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_lore.c",
        {
            bins: ["unsortedbins", "smallbins", "largebins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: []
        }
    ),

    new technique(
        "Overlapping chunks", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/overlapping_chunks.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree", "offByOne", "nullByte"],
            misc: ["old"]
        }
    ),

    new technique(
        "Overlapping chunks 2",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/overlapping_chunks_2.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree", "nullByte", "offByOne"],
            misc: ["old"]
        }
    ),

    new technique(
        "Mmap overlapping chunks", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/mmap_overlapping_chunks.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["mmap"],
        }
    ),

    new technique(
        "House of force", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/house_of_force.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["old", "topChunk"]
        }
    ),

    new technique(
        "Unsorted bin into stack", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/unsorted_bin_into_stack.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    new technique(
        "Unsorted bin attack",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/unsorted_bin_attack.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    new technique(
        "Large bin attack", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/large_bin_attack.c",
        {
            bins: ["largebins"],
            vulns: ["writeAfterFree", "overflow"],
            misc: [],
        }
    ),

    new technique(
        "House of Einherjar",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_einherjar.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "nullByte", "offByOne"],
            misc: ["leak"]
        }
    ),

    new technique(
        "House of Water",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.36/house_of_water.c",
        {
            bins: ["tcache", "unsortedbins"],
            vulns: ["writeAfterFree", "doubleFree"],
            misc: []
        }
    ),

    new technique(
        "House of Orange",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/house_of_orange.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["old", "topChunk", "leak"]
        }
    ),

    new technique(
        "House of Tangerine",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.39/house_of_tangerine.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["topChunk", "leak"]
        }
    ),

    new technique(
        "House of Roman",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/house_of_roman.c",
        {
            bins: ["fastbins", "unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    new technique(
        "Tcache Poison",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/tcache_poisoning.c",
        {
            bins: ["tcache"],
            vulns: ["overflow", "writeAfterFree", "readAfterFree"],
            misc: ["leak"]
        }
    ),


    new technique(
        "Tcache house of spirit",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/tcache_house_of_spirit.c",
        {
            bins: ["tcache"],
            vulns: ["freeArbitraryBullshit"],
            misc: []
        }
    ),

    new technique(
        "House of Botcake",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_botcake.c",
        {
            bins: ["tcache", "unsortedbins"],
            vulns: ["doubleFree"],
            misc: []
        }
    ),

    new technique(
        "Tcache stashing unlink",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/tcache_stashing_unlink_attack.c",
        {
            bins: ["tcache", "smallbins"],
            vulns: ["writeAfterFree", "overflow"],
            misc: ["calloc"]
        }
    ),

    new technique(
        "Fastbin reverse into tcache",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/fastbin_reverse_into_tcache.c",
        {
            bins: ["tcache", "fastbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["leak"],
        }
    ),

    new technique(
        "Fastbin House of Mind",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_mind_fastbin.c",
        {
            bins: ["fastbins"],
            vulns: ["overflow", "offByOne"],
            misc: ["leak"]
        }
    ),
    
    new technique(
        "House of Storm",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/house_of_storm.c",
        {
            bins: ["unsortedbins", "largebins"],
            vulns: ["writeAfterFree", "overflow"],
            misc: ["old"]
        }
    ),

    new technique(
        "House of Gods",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.24/house_of_gods.c",
        {
            bins: ["unsortedbins"],
            vulns: ["writeAfterFree", "overflow"],
            misc: ["old", "leak"]
        }
    ),

    new technique(
        "Double protect (bypass safe-linking)",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.36/safe_link_double_protect.c",
        {
            bins: ["tcache"],
            vulns: ["writeAfterFree","overflow"],
            misc: []
        }
    ),

    new technique(
        "Tcache metadata poisoning", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.36/safe_link_double_protect.c",
        {
            bins: ["tcache"], 
            vulns: ["heapControl"],
            misc: []
        }
    )   
]

function filterVulnType(candidates){
    var vulns = []
    var filteredCandidates = []
    document.getElementById("uaf").checked ? vulns.push("writeAfterFree") : null;
    document.getElementById("overflow").checked ? vulns.push("overflow") : null;
    document.getElementById("offByOne").checked ? vulns.push("offByOne") : null;
    document.getElementById("nullByte").checked ? vulns.push("nullByte") : null;
    document.getElementById("arbFree").checked ? vulns.push("freeArbitraryBullshit") : null;
    document.getElementById("doubleFree").checked ? vulns.push("doubleFree") : null;
    document.getElementById("heapControl").checked ? vulns.push("heapControl") : null;

    
    for(const x of candidates){
        var works = false; 

        for(const vuln of vulns){
            if(x.tags.vulns.includes(vuln)){
                console.log(x)
                works = true
                break
            }
        }
        if(works){
            filteredCandidates.push(x)
        }

    }
    return filteredCandidates
}

function filterBinType(candidates){
    var bins = []
    var filteredCandidates = []

    document.getElementById("tcache").checked ? bins.push("tcache") : null;
    document.getElementById("fastbins").checked ? bins.push("fastbins") : null;
    document.getElementById("unsortedbins").checked ? bins.push("unsortedbins") : null;
    document.getElementById("largebins").checked ? bins.push("largebins") : null;
    document.getElementById("smallbins").checked ? bins.push("smallbins") : null;

    for(const x of candidates){
        var works = true;
        if(x.tags.bins.length == 0){
            filteredCandidates.push(x);
            continue;
        }
        for(const bin of x.tags.bins){
            if(!bins.includes(bin)){
                works = false;
            }
        }
        if(works){
            filteredCandidates.push(x)
        }
    }
    return filteredCandidates;
}

function filterMisc(candidates){
    var misc = [];
    var filteredCandidates = [];

    document.getElementById("mmap").checked ? misc.push("mmap") : null
    document.getElementById("topChunk").checked ? misc.push("topChunk") : null
    document.getElementById("leak").checked ? misc.push("leak") : null
    document.getElementById("old").checked ? misc.push("old") : null

    for(const x of candidates){
        var works = true;
        if(x.tags.misc.length == 0){
            filteredCandidates.push(x);
            continue;
        }
        for(const m of x.tags.misc){
            if(!misc.includes(m)){
                //console.log(m)
                //console.log(x)
                works = false;
            }
        }
        if(works){
            filteredCandidates.push(x)
        }
    }
    return filteredCandidates;
}
function calculateTechniques(){
    for(const x of techniques){
        x.hide()
    }
    var candidates = techniques; 

    candidates = filterVulnType(candidates);
    candidates = filterBinType(candidates);
    candidates = filterMisc(candidates);
    for(candidate of candidates){
        candidate.show();
    }

}
document.addEventListener('click', function(event) {
  if (event.target.type === 'checkbox') {
   calculateTechniques();
  }
});