import * as z from "zod/v4";
import { Compilation } from "../../Compilation";
import { anyFunction } from "../../config/utils";
import { memoize } from "../../util/memoize";
import { validate } from "../../util/validate";

const compilationOptionsMap: WeakMap<Compilation, HtmlRspackPluginOptions> =
	new WeakMap();

export type TemplateRenderFunction = (
	params: Record<string, any>
) => string | Promise<string>;

const templateRenderFunction =
	anyFunction satisfies z.ZodType<TemplateRenderFunction>;

export type TemplateParamFunction = (
	params: Record<string, any>
) => Record<string, any> | Promise<Record<string, any>>;

const templateParamFunction =
	anyFunction satisfies z.ZodType<TemplateParamFunction>;

export type HtmlRspackPluginOptions = {
	/** The title to use for the generated HTML document. */
	title?: string;

	/**
	 * The file to write the HTML to. You can specify a subdirectory here too (e.g.: `"pages/index.html"`).
	 * @default "index.html"
	 */
	filename?: string | ((entry: string) => string);

	/** The template file path. */
	template?: string;

	/**
	 * The template file content, priority is greater than `template` option.
	 *
	 * When using a function, pass in the template parameters and use the returned string as the template content.
	 */
	templateContent?: string | TemplateRenderFunction;

	/**
	 * Allows to overwrite the parameters used in the template.
	 *
	 * When using a function, pass in the original template parameters and use the returned object as the final template parameters.
	 */
	templateParameters?: Record<string, string> | boolean | TemplateParamFunction;

	/**
	 * The script and link tag inject position in template. Use `false` to not inject.
	 * If not specified, it will be automatically determined based on `scriptLoading` value.
	 * @default true
	 */
	inject?: boolean | "head" | "body";

	/** The public path used for script and link tags. */
	publicPath?: string;

	/** Inject a [`base`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) tag. */
	base?:
		| string
		| { href?: string; target?: "_self" | "_blank" | "_parent" | "_top" };

	/**
	 * Modern browsers support non-blocking JavaScript loading ([`defer` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#defer)) to improve the page startup performance.
	 *
	 * Setting this option to `'module'` adds attribute `type="module"` to the `script`. This also implies `defer` attribute on the `script`, since modules are automatically deferred.
	 * @default "defer"
	 * */
	scriptLoading?: "blocking" | "defer" | "module" | "systemjs-module";

	/** Allows you to add only some chunks. */
	chunks?: string[];

	/** Allows you to skip some chunks. */
	excludeChunks?: string[];

	/**
	 * Allows to control how chunks should be sorted before they are included to the HTML.
	 * @default "auto"
	 */
	chunksSortMode?: "auto" | "manual";

	/**
	 * Configure the SRI hash algorithm, which is disabled by default.
	 * @deprecated Use `experiments.SubresourceIntegrityPlugin` instead.
	 */
	sri?: "sha256" | "sha384" | "sha512";

	/**
	 * Controls whether to minify the output, disabled by default.
	 */
	minify?: boolean;

	/** Adds the given favicon path to the output HTML. */
	favicon?: string;

	/**
	 * Allows to inject meta-tags.
	 * @default {}
	 */
	meta?: Record<string, string | Record<string, string>>;

	/**
	 * If `true` then append a unique Rspack compilation hash to all included scripts and CSS files. This is useful for cache busting.
	 */
	hash?: boolean;

	/**
	 * Any other options will be passed by hooks.
	 */
	[key: string]: any;
};

const getPluginOptionsSchema = memoize(
	() =>
		z.object({
			filename: z.string().or(anyFunction).optional(),
			template: z
				.string()
				.refine(val => !val.includes("!"), {
					error:
						"HtmlRspackPlugin does not support template path with loader yet"
				})
				.optional(),
			templateContent: z.string().or(templateRenderFunction).optional(),
			templateParameters: z
				.record(z.string(), z.string())
				.or(z.boolean())
				.or(templateParamFunction)
				.optional(),
			inject: z.enum(["head", "body"]).or(z.boolean()).optional(),
			publicPath: z.string().optional(),
			base: z
				.string()
				.or(
					z.strictObject({
						href: z.string().optional(),
						target: z.enum(["_self", "_blank", "_parent", "_top"]).optional()
					})
				)
				.optional(),
			scriptLoading: z
				.enum(["blocking", "defer", "module", "systemjs-module"])
				.optional(),
			chunks: z.string().array().optional(),
			excludeChunks: z.string().array().optional(),
			chunksSortMode: z.enum(["auto", "manual"]).optional(),
			sri: z.enum(["sha256", "sha384", "sha512"]).optional(),
			minify: z.boolean().optional(),
			title: z.string().optional(),
			favicon: z.string().optional(),
			meta: z
				.record(z.string(), z.string().or(z.record(z.string(), z.string())))
				.optional(),
			hash: z.boolean().optional()
		}) satisfies z.ZodType<HtmlRspackPluginOptions>
);

export function validateHtmlPluginOptions(options: HtmlRspackPluginOptions) {
	return validate(options, getPluginOptionsSchema());
}

export const getPluginOptions = (compilation: Compilation, uid: number) => {
	if (!(compilation instanceof Compilation)) {
		throw new TypeError(
			"The 'compilation' argument must be an instance of Compilation"
		);
	}
	return compilationOptionsMap.get(compilation)?.[uid];
};

export const setPluginOptions = (
	compilation: Compilation,
	uid: number,
	options: HtmlRspackPluginOptions
) => {
	const optionsMap = compilationOptionsMap.get(compilation) || {};
	optionsMap[uid] = options;
	compilationOptionsMap.set(compilation, optionsMap);
};

export const cleanPluginOptions = (compilation: Compilation, uid: number) => {
	const optionsMap = compilationOptionsMap.get(compilation) || {};
	delete optionsMap[uid];
	if (Object.keys(optionsMap).length === 0) {
		compilationOptionsMap.delete(compilation);
	} else {
		compilationOptionsMap.set(compilation, optionsMap);
	}
};
