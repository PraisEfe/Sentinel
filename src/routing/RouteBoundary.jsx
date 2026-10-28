import { Component } from "react";
export default class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="research-page" role="alert"><h1>We couldn’t open this page.</h1><p>Please check your connection and try again.</p><button className="outline-button" onClick={()=>window.location.reload()}>Reload page</button></section>;
    return this.props.children;
  }
}
