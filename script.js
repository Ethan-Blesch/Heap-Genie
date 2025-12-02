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

class Question {
    constructor(text, answerElement, containerId, tooltip){
        this.text = text;
        this.answerElement = answerElement;
        this.tooltip = tooltip;
        this.answer = null;
        document.getElementById(containerId).appendChild(createQuestionTemplate(this.text, this.answerElement, this.tooltip) );
    }

    getAnswer(){
        console.log("Answer not implemented by child class!")
    }
}

class yesNoQuestion extends Question {
    constructor(text, containerId, tooltip){
        var answerElement = document.createElement('input');
        answerElement.type = 'checkbox';
        const yesOption = document.createElement('option');
        yesOption.value = 'yes';
        yesOption.text = 'Yes';
        const noOption = document.createElement('option');
        noOption.value = 'no';
        noOption.text = 'No';

        super(text, answerElement, containerId, tooltip);
    }
    getAnswer(){
        return this.answerElement.checked;
    }
}

class numberQuestion extends Question {
    constructor(text, min, max, containerId, tooltip){
        var answerElement = document.createElement('input');
        answerElement.type = 'number';
        answerElement.min = min;
        answerElement.max = max;
        super(text, answerElement, containerId, tooltip);        
    }
    getAnswer(){
        return parseFloat(this.answerElement.value);
    }
}



class technique {
    tags = {}
    constructor(name, link, tags){
        this.tags = tags
        var answerTemplate = createAnswerTemplate(name, link);
        document.getElementById("techniques").appendChild(answerTemplate);  
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


var canReadAfterFree = new yesNoQuestion("Read from freed chunks? ", "vulnType", vulnTooltips.readAfterFree)
var canWriteAfterFree = new yesNoQuestion("Write to freed chunks? ", "vulnType", vulnTooltips.writeAfterFree)
var canDoubleFree = new yesNoQuestion("Double-free? ", "vulnType", vulnTooltips.doubleFree)
var canOverflow = new yesNoQuestion("Overflow (not counting off-by-one)? ", "vulnType", vulnTooltips.overflow)
var nullByte = new yesNoQuestion("Null-byte/off-by-one overflow? ", "vulnType", vulnTooltips.nullByte)
var canFreeArbitraryBullshit = new yesNoQuestion("Free a controlled pointer (for crafting fake chunks)? ", "vulnType", vulnTooltips.freeArbitraryBullshit)

var tcache = new yesNoQuestion("tcache ", "binType", binTooltips.tcache)
var fastbins = new yesNoQuestion("fastbins ", "binType", binTooltips.fastbins)
var smallbins = new yesNoQuestion("smallbins ","binType", binTooltips.smallbins)
var largebins = new yesNoQuestion("largebins ", "binType", binTooltips.largebins)
var unsortedbins = new yesNoQuestion("unsortedbins ", "binType", binTooltips.unsortedbins)

var consolidate = new yesNoQuestion("Free w/ size >= 0x3f0 (for consolidation)?", "constraints", constraintsTooltips.consolidate)
var sort = new yesNoQuestion("Trigger bin sorting? ", "constraints", constraintsTooltips.sort)
var old = new yesNoQuestion("Show techniques for older libc versions? ", "constraints", constraintsTooltips.old)
var mmap = new yesNoQuestion("Get an mmapped chunk? ", "constraints", constraintsTooltips.mmap)







/*


*/

var techniques = {
    fastbinDup: new technique(
        "Fastbin Duplication", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/fastbin_dup.c",
        {
            bins: ["fastbins"],
            vulns: ["doublefree"],
            misc: []
        }
    ),

    fastbinConsolidate: new technique(
        "Fastbin dup consolidate",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/fastbin_dup_consolidate.c",
        {
            bins: ["fastbins"],
            vulns: ["doubleFree"],
            misc: ["consolidate"]
        }
    ),
    
    unsafeUnlink: new technique(
        "Unsafe unlink", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/unsafe_unlink.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow"],
            misc: []
        }
    ),
    
    houseOfSpirit: new technique(
        "House of Spirit", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_spirit.c",
        {
            bins: ["fastbins"],
            vulns: ["freeArbitraryBullshit"],
            misc: ["outsideHeap"]
        }
    ),

    nullBytePoison: new technique(
        "Poison null byte",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/poison_null_byte.c",
        {
            bins: ["smallbins", "largebins", "unsorterdbins"],
            vulns: ["nullByte", "offByOne", "overflow"],
            misc: ["sort", "consolidate"],
        }
    ),
    
    houseOfLore: new technique(
        "House of Lore", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_lore.c",
        {
            bins: ["unsortedbins", "smallbins", "largebins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["outsideHeap"]
        }
    ),

    overlappingChunks: new technique(
        "Overlapping chunks", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/overlapping_chunks.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree", "offByOne", "nullByte"],
            misc: ["old"]
        }
    ),

    overlappingChunks2: new technique(
        "Overlapping chunks 2",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/overlapping_chunks_2.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree", "nullByte", "offByOne"],
            misc: ["old"]
        }
    ),

    mmapOverlap: new technique(
        "Mmap overlapping chunks", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/mmap_overlapping_chunks.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["mmap"],
        }
    ),

    houseOfForce: new technique(
        "House of force", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/house_of_force.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["old", "topChunk"]
        }
    ),

    unsortedBinIntoStack: new technique(
        "Unsorted bin into stack", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/unsorted_bin_into_stack.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    unsortedBinAttack: new technique(
        "Unsorted bin attack",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.27/unsorted_bin_attack.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    largeBinAttack: new technique(
        "Large bin attack", 
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/large_bin_attack.c",
        {
            bins: ["largebins"],
            vulns: ["writeAfterFree", "overflow"],
            misc: ["sort"],
        }
    ),

    houseOfEinherjar: new technique(
        "House of Einherjar",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/house_of_einherjar.c",
        {
            bins: ["unsortedbins"],
            vulns: ["overflow", "nullByte", "offByOne"],
            misc: []
        }
    ),

    houseOfWater: new technique(
        "House of Water",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.36/house_of_water.c",
        {
            bins: ["tcache", "unsortedbins"],
            vulns: ["writeAfterFree", "doubleFree"],
            misc: []
        }
    ),

    houseOfOrange: new technique(
        "House of Orange",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/house_of_orange.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["old", "topChunk"]
        }
    ),

    houseOfTangerine: new technique(
        "House of Tangerine",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.39/house_of_tangerine.c",
        {
            bins: [],
            vulns: ["overflow"],
            misc: ["topChunk"]
        }
    ),

    houseOfRoman: new technique(
        "House of Roman",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.23/house_of_roman.c",
        {
            bins: ["fastbins", "unsortedbins"],
            vulns: ["overflow", "writeAfterFree"],
            misc: ["old"]
        }
    ),

    tcachePoison: new technique(
        "Tcache Poison",
        "https://github.com/shellphish/how2heap/blob/master/glibc_2.35/tcache_poisoning.c",
        {
            bins: ["tcache"],
            vulns: ["overflow", "writeAfterFree", "readAfterFree"]
        }
    ),

    
    
    
}