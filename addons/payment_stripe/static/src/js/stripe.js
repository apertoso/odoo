odoo.define('payment_stripe.stripe', function(require) {
    "use strict";

    var ajax = require('web.ajax');
    // The following currencies are integer only, see
    // https://stripe.com/docs/currencies#zero-decimal
    var int_currencies = [
        'BIF', 'XAF', 'XPF', 'CLP', 'KMF', 'DJF', 'GNF', 'JPY', 'MGA', 'PYGí',
        'RWF', 'KRW', 'VUV', 'VND', 'XOF'
    ];

    var handler = StripeCheckout.configure({
        key: $("input[name='stripe_key']").val(),
        image: $("input[name='stripe_image']").val(),
        locale: 'auto',
        closed: function() {
          if (!handler.isTokenGenerate) {
                $('#pay_stripe')
                    .removeAttr('disabled')
                    .find('i').remove();
          }
        },
        token: function(token, args) {
            handler.isTokenGenerate = true;
            ajax.jsonRpc("/payment/stripe/create_charge", 'call', {
                tokenid: token.id,
                email: token.email,
                amount: $("input[name='amount']").val(),
                acquirer_id: $("#acquirer_stripe").val(),
                currency: $("input[name='currency']").val(),
                invoice_num: $("input[name='invoice_num']").val(),
                return_url: $("input[name='return_url']").val()
            }).done(function(data){
                handler.isTokenGenerate = false;
                window.location.href = data;
            });
        },
    });

    $('#pay_stripe').on('click', function(e) {
        // Open Checkout with further options
        if(!$(this).find('i').length)
            $(this).append('<i class="fa fa-spinner fa-spin"/>');
            $(this).attr('disabled','disabled');

        var $form = $(e.currentTarget).parents('form');
        var acquirer_id = $(e.currentTarget).closest('div.o_payment_acquirer_button,div.oe_quote_acquirer_button,div.o_website_payment_new_payment');
        acquirer_id = acquirer_id.data('id') || acquirer_id.data('acquirer_id');
        if (! acquirer_id) {
            return false;
        }

        var access_token = $("input[name='token']").val();
        var so_id = $("input[name='return_url']").val().match(/quote\/([0-9]+)/) || undefined;
        if (so_id) {
            so_id = parseInt(so_id[1]);
        }

        e.preventDefault();
        if ($('.o_website_payment').length !== 0) {
            var currency = $("input[name='currency']").val();
            var amount = parseFloat($("input[name='amount']").val() || '0.0');
            if (!_.contains(int_currencies, currency)) {
                amount = amount*100;
            }

            ajax.jsonRpc('/website_payment/transaction', 'call', {
                    reference: $("input[name='invoice_num']").val(),
                    amount: amount,
                    currency_id: currency,
                    acquirer_id: acquirer_id
                })
                handler.open({
                    name: $("input[name='merchant']").val(),
                    description: $("input[name='invoice_num']").val(),
                    currency: currency,
                    amount: amount,
                });
        } else {
            var currency = $("input[name='currency']").val();
            var amount = parseFloat($("input[name='amount']").val() || '0.0');
            if (!_.contains(int_currencies, currency)) {
                amount = amount*100;
            }

            ajax.jsonRpc('/shop/payment/transaction/' + acquirer_id, 'call', {
                    so_id: so_id,
                    access_token: access_token
                }, {'async': false}).then(function (data) {
                $form.html(data);
                handler.open({
                    name: $("input[name='merchant']").val(),
                    description: $("input[name='invoice_num']").val(),
                    currency: currency,
                    amount: amount,
                });
            });
        }
    });
});
