# jsoncv

A toolkit for building your CV with JSON and creating stylish HTML/PDF files.

jsoncv comprises the following components:

1. Schema
2. Editor
3. CV HTML
4. Converters

For in-depth explanations and usage guidelines, please refer to the documentation below.

## Introduction

### Schema

jsoncv uses [JSON Schema](https://json-schema.org/) to create a JSON-based standard for CVs.

The schema used in jsoncv is a fork of the [JSON Resume Schema](https://jsonresume.org/schema/),
with the following differences:

- JSON Schema version

    JSON Resume utilizes the outdated draft-04 version, while jsoncv uses the current draft-07. To ensure compatibility with draft-07, all instances of `additionalItems` have been removed.
- Additional `sideProjects` section

    jsoncv includes an additional section, called `sideProjects`, that allows for the distinction between side projects and career projects.
- Extended `meta` section

    jsoncv extends the `meta` section with several properties:
    - `name` — the desired name for exported files
    - `theme` — the theme to use for rendering (`xenking` or `reorx`)
    - `hiddenSections` — array of section names to hide from the rendered CV
    - `hiddenFields` — object mapping section keys to arrays of field names to hide (e.g. `{ "meta": ["lastModified"] }`)
    - `sectionOrder` — custom ordering of CV sections (drag-to-reorder in editor)
    - `siteUrl` — URL shown in the CV footer (leave empty to hide)
    - `showFooter` — boolean to show/hide the footer entirely (default: true)

These differences do not impact the compatibility between jsoncv and JSON Resume. This means that you can easily import JSON Resume data into jsoncv and vice versa, as jsoncv data will pass the validation of JSON Resume Schema.

### Editor

![](images/editor.png)

jsoncv comes with an online editor that provides a graphical user interface for creating and editing your jsoncv data.
Visit it at <https://cv.xenking.pro/editor/>.

The Editor consists of three panes, from left to right:

1. Sidebar

    Provides grouped action buttons (Settings, Export, Data, View) and a dynamic table of contents that updates as you edit. Settings include primary color picker and theme selector.
2. Editor

    A Notion-like editor where you can edit the properties of your CV data. Features include:
    - Drag-to-reorder sections (persisted in `meta.sectionOrder`)
    - Per-section and per-item field visibility toggles (persisted in `meta.hiddenFields`)
    - Collapsible sections and array items
    - Inline add/delete/duplicate for array items
3. Preview

    Displays the rendered CV HTML as changes are made. Toggle between HTML preview and JSON preview with copy-to-clipboard support.

### CV HTML

The core product of jsoncv is CV HTML, which is the HTML representation of your jsoncv data.
It is a compact, single-file HTML document that can be converted to PDF or hosted online to create a static CV website.

CV HTML is designed with a specific layout to display a CV on an A4 sheet of paper.
The CSS has been tailored to optimize printing, ensuring the best typography whether printed on paper or saved as a PDF.
Therefore, CV HTML is best suited for creating professional or academic CVs/resumes,
rather than creative or interactive portfolio websites.

CV HTML supports themes, which can be found in the `src/themes` directory.

To get CV HTML, please refer to [Export CV data and HTML](#export-cv-data-and-html) and [Build HTML locally](#build-html-locally).

### Converters

Converters are scripts to help users converting jsoncv data from/to other sources.

Currently, there is only one converter available: `rxresume-to-jsoncv.js`, which converts data exported from [RxResume](https://rxresu.me/) into the jsoncv format.

If you have any additional requirements, please feel free to submit an issue. Pull requests are also greatly appreciated.

## Usage

### Write your CV

It is recommended to write your CV using the online [Editor](https://cv.xenking.pro/editor/).
However, if you are comfortable with JSON, you can maintain the data file using a text editor on your local machine.

When you open the Editor for the first time, a sample data is loaded.
You can either edit it or click the **New** button to start with an empty form.
Your CV data is saved in your browser's localStorage every time you make a change,
so you don't have to worry about losing your work.

If you already have a local copy of your CV data, click the **Open** button to load it into the Editor.

### Export CV data and HTML

Once you have finished editing, you can click the **JSON** button to export your CV data in JSON format.

If you want to export the rendered HTML in the Preview pane, click the **HTML** button.

To save as PDF, click the **PDF** button which opens the browser's print dialog.

Please note that you can name the exported files by setting the `meta.name` property.
If it is not specified, the filename will be constructed using a combination of `basics.name` and `meta.version`.

### Build HTML locally

jsoncv uses [Vite](https://vitejs.dev/) as its static-site building tool.
The `index.html` file in the root of the project is the entry point for building a single-file CV HTML.

Here are the steps to build a CV HTML using your own data:

1. Make sure that you are using Node.js version 18 or higher.
2. Install the dependencies by running: `pnpm install`
3. Build your CV HTML by specifying `DATA_FILENAME` and `OUT_DIR` environment variables:

    ```
    DATA_FILENAME="$HOME/Downloads/mycv/cv.json" OUT_DIR="$HOME/Downloads/mycv" pnpm run build
    ```

    This will build your CV HTML using the data file located at `$HOME/Downloads/mycv/cv.json`,
    and the generated HTML will be located in the `$HOME/Downloads/mycv` directory.

The following environment variables are supported in the build process:

- `DATA_FILENAME`: The CV data to use, can be a relative or absolute path.
- `OUT_DIR`: The output directory for the generated HTML file.
- `THEME`: The theme to use, must be one of the directory names in `src/themes/`.
- `SITE_URL`: URL to show in the CV footer (overrides `meta.siteUrl` from the data file).

### Build all resumes

To build all resumes in the `resumes/` directory (JSON, HTML, and PDF):

```
pnpm run build-all
```

This runs `build-site` (the editor) followed by `build-resumes` which processes each JSON file in `resumes/`.
PDF generation uses either Cloudflare Browser Rendering API (if `CF_ACCOUNT_ID` and `CF_API_TOKEN` are set) or local Puppeteer.

### Build the editor site

```
pnpm run build-site
```

This builds the editor UI to `dist/`.

### Create your own theme

jsoncv includes several built-in themes that you can use either directly in the Editor or when building the static CV site.
If you want to create your own custom theme, here is how:

The file system hierarchy for themes is as follows:

```
src/themes
├── xenking
│   ├── index.ejs
│   └── index.scss
└── reorx
    ├── index.ejs
    └── index.scss
```

You can add your own theme by creating a new folder under `src/themes`
with `index.ejs` and `index.scss` files.

`index.ejs` is an [ejs](https://ejs.co/) template used for constructing the CV content.
The data that is passed to the template is structured as follows:

- `cv`: the entire jsoncv data that conforms to the jsoncv schema
- `fn`: a set of utility functions
  - `getCVTitle`: gets the CV title from `cv` data
  - `reformatDate`: transforms a date string to a specified format
  - `getIconSVG`: gets the iconify SVG string or DOM element from the icon name
  - `noSchemaURL`: removes the schema (`https://`) prefix of the URL
  - `renderMarkdown`: renders markdown text to HTML
  - `isHidden(section)`: checks if a section is hidden via `meta.hiddenSections`
  - `isFieldHidden(section, field)`: checks if a field is hidden via `meta.hiddenFields`
- `siteUrl`: the site URL from `meta.siteUrl` or `SITE_URL` env
- `isPreview`: whether rendering in the editor preview iframe

For more information, see the complete definition in [src/themes/data.js](https://github.com/xenking/jsoncv/blob/master/src/themes/data.js).

Once you have created a new theme (let's use `yourtheme` as an example),
you can start developing and previewing it by running:

```
THEME=yourtheme pnpm run dev-site
```

Pull requests for adding new themes are always welcomed.

## Tech stack

- Vite
- EJS templates
- SCSS
- SortableJS (drag-and-drop reordering)
- Iconify (icons)
- dayjs (date formatting)
- markdown-it (markdown rendering)

## FAQ

### Text copied from the PDF is reversed

Yes, this is a known issue with Chrome's "Save as PDF" feature.
The resulting PDFs can have text that is backwards when copied in Preview.app on macOS.

![](images/chrome-reversed-text-problem.png)

This issue has been reported by several users and is not specific to jsoncv. As seen in:
["Save as PDF" produces documents with backwards text. - Google Chrome Community](https://support.google.com/chrome/thread/29061484/save-as-pdf-produces-documents-with-backwards-text?hl=en&dark=0)

Solution: Use Firefox or Safari to get the PDF.

## Credits

jsoncv fork could not be made possible without these awesome projects below:

- [JSON Resume](https://jsonresume.org/)
- [iconify](https://iconify.design/)
- [jsoncv](https://github.com/reorx/jsoncv)
