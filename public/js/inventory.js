// Inventory and block selection
class Inventory {
  constructor() {
    this.selectedBlock = 'grass';
    this.slots = document.querySelectorAll('.inv-slot');
    
    this.setupInventory();
  }
  
  setupInventory() {
    // Click handlers for inventory slots
    this.slots.forEach(slot => {
      slot.addEventListener('click', (e) => {
        this.selectBlock(slot.dataset.block);
      });
      
      // Touch support
      slot.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.selectBlock(slot.dataset.block);
      });
    });
    
    // Keyboard shortcuts (1-6)
    document.addEventListener('keydown', (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= this.slots.length) {
        const slot = this.slots[num - 1];
        this.selectBlock(slot.dataset.block);
      }
    });
    
    // Mouse wheel to cycle through blocks
    document.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentIndex = Array.from(this.slots).findIndex(
        slot => slot.classList.contains('active')
      );
      
      let newIndex;
      if (e.deltaY > 0) {
        newIndex = (currentIndex + 1) % this.slots.length;
      } else {
        newIndex = (currentIndex - 1 + this.slots.length) % this.slots.length;
      }
      
      const newSlot = this.slots[newIndex];
      this.selectBlock(newSlot.dataset.block);
    }, { passive: false });
  }
  
  selectBlock(blockType) {
    this.selectedBlock = blockType;
    
    // Update UI
    this.slots.forEach(slot => {
      if (slot.dataset.block === blockType) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });
  }
  
  getSelectedBlock() {
    return this.selectedBlock;
  }
}
