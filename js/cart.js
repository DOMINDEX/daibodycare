const STORAGE_PREFIX = 'domindex_cart_';

export class Cart {
    constructor(storageKey = 'default') {
        this.storageKey = STORAGE_PREFIX + storageKey;
        this.items = this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        } catch (e) {
            // localStorage unavailable — fail silently
        }

        window.dispatchEvent(
            new CustomEvent('dx:cart-updated', {
                detail: { items: this.items },
            })
        );
    }

    /**
     * @param {{
     *   id: string,
     *   title: string,
     *   price: number,
     *   image?: string,
     *   categoryId?: string,
     *   categoryName?: string
     * }} item
     */
    add(item, qty = 1) {
        const existing = this.items.find((i) => i.id === item.id);

        if (existing) {
            existing.qty += qty;
        } else {
            this.items.push({
                id: item.id,
                title: item.title,
                price: item.price || 0,
                image: item.image || '',
                categoryId: item.categoryId || '',
                categoryName: item.categoryName || '',
                qty,
            });
        }

        this._save();
    }

    remove(id) {
        this.items = this.items.filter((i) => i.id !== id);
        this._save();
    }

    updateQuantity(id, qty) {
        const existing = this.items.find((i) => i.id === id);

        if (!existing) return;

        if (qty <= 0) {
            this.remove(id);
            return;
        }

        existing.qty = qty;
        this._save();
    }

    clear() {
        this.items = [];
        this._save();
    }

    getItems() {
        return [...this.items];
    }

    getCount() {
        return this.items.reduce((sum, i) => sum + i.qty, 0);
    }

    getSubtotal() {
        return this.items.reduce(
            (sum, i) => sum + i.price * i.qty,
            0
        );
    }

    getTotal(deliveryFee = 0) {
        return this.getSubtotal() + (Number(deliveryFee) || 0);
    }
}