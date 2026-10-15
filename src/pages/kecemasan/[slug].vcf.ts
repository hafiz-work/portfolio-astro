// Static vCard per contact (/kecemasan/<group>-<n>.vcf) for the "Simpan" button:
// iOS Safari opens it as a contact preview, Android downloads it and opens Contacts.
import type { APIRoute, GetStaticPaths } from "astro";
import { KECEMASAN, vcard, vcardSlug } from "../../data/kecemasan";

export const prerender = true;

export const getStaticPaths = (() =>
  KECEMASAN.flatMap((g) =>
    g.contacts.flatMap((c, i) =>
      c.number ? [{ params: { slug: vcardSlug(g, i) }, props: { body: vcard(g, c) } }] : [],
    ),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.body as string, { headers: { "Content-Type": "text/vcard; charset=utf-8" } });
