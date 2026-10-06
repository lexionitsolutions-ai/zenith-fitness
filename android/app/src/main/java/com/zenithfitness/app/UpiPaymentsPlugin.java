package com.zenithfitness.app;

import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpiPayments")
public class UpiPaymentsPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String raw = call.getString("uri", "");
        Uri uri = Uri.parse(raw);
        if (!"upi".equals(uri.getScheme()) || !"pay".equals(uri.getHost()) || !"zenithfitness360@okicici".equals(uri.getQueryParameter("pa"))) {
            call.reject("Invalid gym payment link");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        String app = call.getString("app", "all");
        if ("gpay".equals(app)) intent.setPackage("com.google.android.apps.nbu.paisa.user");
        else if ("phonepe".equals(app)) intent.setPackage("com.phonepe.app");
        else if ("paytm".equals(app)) intent.setPackage("net.one97.paytm");
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity("all".equals(app) ? Intent.createChooser(intent, "Pay with UPI") : intent);
                call.resolve();
            } catch (ActivityNotFoundException e) {
                call.reject("The selected UPI app is not installed or cannot handle this payment link", "UPI_APP_UNAVAILABLE", e);
            } catch (SecurityException e) {
                call.reject("Android blocked opening the selected payment app", "UPI_LAUNCH_BLOCKED", e);
            }
        });
    }
}
