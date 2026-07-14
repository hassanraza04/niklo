"""Security checks for the operator-only venue photo cache."""

import unittest

from pipeline.photos import validate_photo_url


class PhotoUrlValidationTest(unittest.TestCase):
    def test_accepts_public_https_photo_urls(self) -> None:
        self.assertEqual(
            validate_photo_url("https://lh3.googleusercontent.com/example-photo"),
            "https://lh3.googleusercontent.com/example-photo",
        )

    def test_rejects_private_or_non_https_photo_urls(self) -> None:
        for url in (
            "http://example.com/photo.jpg",
            "https://localhost/photo.jpg",
            "https://127.0.0.1/photo.jpg",
            "https://user:password@example.com/photo.jpg",
        ):
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    validate_photo_url(url)


if __name__ == "__main__":
    unittest.main()
