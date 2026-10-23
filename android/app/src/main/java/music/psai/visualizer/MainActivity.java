package music.psai.visualizer;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.OutputStream;

public class MainActivity extends Activity {
  private ValueCallback<Uri[]> pendingFiles;
  private WebView web;
  private static final int PICK_FILE = 27;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);setContentView(web);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setMediaPlaybackRequiresUserGesture(true);
    web.addJavascriptInterface(new AndroidDownloads(), "PSAndroid");
    WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web.setWebViewClient(new WebViewClientCompat() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return loader.shouldInterceptRequest(request.getUrl());
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
        if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
        pendingFiles=callback;
        try{startActivityForResult(params.createIntent(),PICK_FILE);return true;}
        catch(Exception ex){pendingFiles=null;Toast.makeText(MainActivity.this,"Dateiauswahl nicht verfügbar",Toast.LENGTH_SHORT).show();return false;}
      }
    });
    web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
  }
  @Override protected void onActivityResult(int code,int result,Intent data){
    super.onActivityResult(code,result,data);
    if(code==PICK_FILE&&pendingFiles!=null){
      pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));pendingFiles=null;
    }
  }
  public class AndroidDownloads {
    private OutputStream output;
    @JavascriptInterface public synchronized void begin(String name,String mime){
      try {
        if(output!=null){output.close();output=null;}
        ContentValues values=new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME,name.replaceAll("[^a-zA-Z0-9._ -]","_"));
        values.put(MediaStore.Downloads.MIME_TYPE,mime);
        values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/PS AI MUSIC");
        Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
        if(uri==null)throw new Exception("No download URI");
        output=getContentResolver().openOutputStream(uri);
      }catch(Exception ex){android.util.Log.e("PSVisualizer","Download begin failed",ex);}
    }
    @JavascriptInterface public synchronized void append(String base64){
      try{if(output!=null)output.write(Base64.decode(base64,Base64.DEFAULT));}
      catch(Exception ex){android.util.Log.e("PSVisualizer","Download write failed",ex);}
    }
    @JavascriptInterface public synchronized void finish(){
      try{if(output!=null){output.close();output=null;runOnUiThread(()->Toast.makeText(MainActivity.this,"Gespeichert unter Downloads / PS AI MUSIC",Toast.LENGTH_LONG).show());}}
      catch(Exception ex){android.util.Log.e("PSVisualizer","Download end failed",ex);}
    }
  }
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
