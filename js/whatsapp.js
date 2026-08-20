function formatMoney(value, currency) {
    try {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency || 'ARS',
            maximumFractionDigits: 0,
        }).format(value);
    } catch (e) {
        return `$${Math.round(value).toLocaleString('es-AR')}`;
    }
}

export function generateWhatsAppMessage(
    cart,
    customerData,
    config
) {
    const items = cart.getItems();
    const currency = config.currency || 'ARS';

    const lines = [];

    lines.push(
        `NUEVO PEDIDO - ${config.businessName || 'Pedido'}`
    );

    lines.push('');
    lines.push('------------------------------');
    lines.push('PEDIDO');
    lines.push('');

    // Agrupar productos por categoría
    const grouped = {};

    items.forEach((item) => {
        const category =
            item.categoryName || 'Otros';

        if (!grouped[category]) {
            grouped[category] = [];
        }

        grouped[category].push(item);
    });

    Object.entries(grouped).forEach(
        ([category, categoryItems]) => {
            lines.push(category);

            categoryItems.forEach((item) => {
                const lineTotal =
                    item.price * item.qty;

                lines.push(
                    `- ${item.qty}x ${item.title} — ${formatMoney(
                        lineTotal,
                        currency
                    )}`
                );
            });

            lines.push('');
        }
    );

    const subtotal = cart.getSubtotal();

    const isDelivery =
        customerData.deliveryMethod === 'delivery';

    const deliveryFee =
        isDelivery
            ? config.deliveryFee
            : 0;

    const hasKnownDeliveryFee =
        deliveryFee !== null &&
        deliveryFee !== undefined;

    const total =
        hasKnownDeliveryFee
            ? subtotal + Number(deliveryFee)
            : subtotal;

    lines.push('------------------------------');

    lines.push(
        `SUBTOTAL: ${formatMoney(
            subtotal,
            currency
        )}`
    );

    if (isDelivery) {
        if (hasKnownDeliveryFee) {
            lines.push(
                `ENVIO: ${formatMoney(
                    deliveryFee,
                    currency
                )}`
            );

            lines.push(
                `TOTAL: ${formatMoney(
                    total,
                    currency
                )}`
            );
        } else {
            lines.push('ENVIO: A CONFIRMAR');

            lines.push(
                `TOTAL: ${formatMoney(
                    subtotal,
                    currency
                )} + envio`
            );
        }
    } else {
        lines.push('ENVIO: $0');

        lines.push(
            `TOTAL: ${formatMoney(
                subtotal,
                currency
            )}`
        );
    }

    lines.push('');
    lines.push('------------------------------');
    lines.push('ENTREGA');

    if (isDelivery) {
        lines.push('Modalidad: Delivery');

        if (customerData.address) {
            lines.push(
                `Direccion: ${customerData.address}`
            );
        }

        if (customerData.betweenStreets) {
            lines.push(
                `Entre calles: ${customerData.betweenStreets}`
            );
        }
    } else {
        lines.push('Modalidad: Retiro');
    }

    lines.push('');
    lines.push('CLIENTE');

    lines.push(
        `Nombre: ${customerData.name || '-'}`
    );

    lines.push(
        `Telefono: ${customerData.phone || '-'}`
    );

    if (
        config.enableTableService &&
        config.tableNumber
    ) {
        lines.push(
            `Mesa: ${config.tableNumber}`
        );
    }

    if (customerData.notes) {
        lines.push('');
        lines.push('OBSERVACIONES');
        lines.push(customerData.notes);
    }

    const message = lines.join('\n');

    const phone = (config.whatsapp || '')
        .replace(/[^\d]/g, '');

    return `https://wa.me/${phone}?text=${encodeURIComponent(
        message
    )}`;
}

export function generateInquiryMessage(
    item,
    config
) {
    const lines = [
        `Hola ${config.businessName || ''}!`.trim(),
        `Queria consultar por: *${item.title}*`,
    ];

    const message = lines.join('\n');

    const phone = (config.whatsapp || '')
        .replace(/[^\d]/g, '');

    return `https://wa.me/${phone}?text=${encodeURIComponent(
        message
    )}`;
}