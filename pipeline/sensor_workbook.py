"""Read cached NASA XLSX cells without evaluating formulas or adding dependencies."""

import posixpath
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def worksheet_member(archive, name):
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    sheets = workbook.find(f"{NS}sheets")
    sheet = next(item for item in sheets if item.get("name") == name)
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target = next(item.get("Target") for item in relationships if item.get("Id") == sheet.get(f"{REL}id"))
    return posixpath.normpath(posixpath.join("xl", target)).lstrip("/")


def cell_value(cell, strings):
    value = cell.find(f"{NS}v")
    if cell.get("t") == "inlineStr":
        return "".join(cell.find(f"{NS}is").itertext())
    if value is None or value.text is None:
        return ""  # Missing formula caches remain missing; never calculate them.
    return strings[int(value.text)] if cell.get("t") == "s" else value.text


def sheet_rows(stream, strings):
    for _, element in ET.iterparse(stream, events=("end",)):
        if element.tag == f"{NS}row":
            values = {re.sub(r"\d", "", cell.get("r")): cell_value(cell, strings) for cell in element}
            yield int(element.get("r")), values
            element.clear()


def workbook_rows(path, sheet="Calibrated Data"):
    """Yield original row numbers and column-letter keyed, unrounded source text."""
    with ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        with archive.open(worksheet_member(archive, sheet)) as stream:
            yield from sheet_rows(stream, strings)
