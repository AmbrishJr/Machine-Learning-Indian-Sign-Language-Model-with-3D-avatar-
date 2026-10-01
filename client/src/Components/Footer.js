import React from 'react'
import { Link } from 'react-router-dom'

function Footer() {
    return (
        <footer className="app-footer">
            <div className="container-xl px-3 px-lg-4">
                <div className="footer-grid">
                    <div className="footer-about">
                        <h6>ISL Genie</h6>
                        <p className="mb-2">A comprehensive toolkit containing various features related to Indian Sign Language.</p>
                        <a href="https://github.com/AmbrishJr" target="_blank" rel="noopener noreferrer">
                            <i className="fa fa-github me-1" /> View on GitHub
                        </a>
                    </div>
                    <div>
                        <h6>Services</h6>
                        <ul>
                            <li><Link to='/sign-kit/convert'>Convert</Link></li>
                            <li><Link to='/sign-kit/learn-sign'>Learn Sign</Link></li>
                            <li><Link to='/sign-kit/all-videos'>Videos</Link></li>
                            <li><Link to='/sign-kit/avatar'>Avatar Studio</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h6>Useful links</h6>
                        <ul>
                            <li><Link to='/sign-kit/home'>Home</Link></li>
                            <li><a href="https://github.com/AmbrishJr" target="_blank" rel="noopener noreferrer">Github repo</a></li>
                        </ul>
                    </div>
                    <div className="footer-contact-col">
                        <h6>Contact</h6>
                        <ul className="footer-contact">
                            <li><i className="fa fa-map-marker" />Chennai, Tamil Nadu</li>
                            <li><i className="fa fa-envelope" /><a href="mailto:10d.ambrish.s.2376@gmail.com">10d.ambrish.s.2376@gmail.com</a></li>
                            <li><i className="fa fa-envelope" /><a href="mailto:muthumkm2411@gmail.com">muthumkm2411@gmail.com</a></li>
                            <li><i className="fa fa-linkedin" /><a href="https://www.linkedin.com/in/ambrish-s-a42296290/" target="_blank" rel="noopener noreferrer">Ambrish S</a></li>
                            <li><i className="fa fa-linkedin" /><a href="https://www.linkedin.com/in/muthu-kumaran-m-125653290/" target="_blank" rel="noopener noreferrer">Muthu Kumaran M</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} ISL Genie</span>
                    <span>Core course project</span>
                </div>
            </div>
        </footer>
    )
}

export default Footer
